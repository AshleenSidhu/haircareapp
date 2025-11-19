import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Droplets, Wind, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { generateRecommendations, UserQuizAnswers } from "../lib/recommendations";
import { useToast } from "../hooks/use-toast";

interface QuizResult {
  id: string;
  answers: Record<string, any>;
  timestamp: any;
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any> | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchLatestQuiz = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        // Try to get quiz from location state first (if coming from quiz)
        const stateAnswers = location.state?.answers;
        if (stateAnswers) {
          setQuizAnswers(stateAnswers);
          setLoading(false); // Show UI immediately
          // Generate recommendations in background
          generateProductRecommendations(stateAnswers);
          return;
        }

        // Otherwise fetch latest from Firestore
        const quizResultsRef = collection(db, "quizResults");
        const q = query(
          quizResultsRef,
          where("userId", "==", currentUser.uid),
          orderBy("timestamp", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const latestResult = querySnapshot.docs[0].data();
          setQuizAnswers(latestResult.answers);
          setLoading(false); // Show UI immediately
          // Generate recommendations in background
          generateProductRecommendations(latestResult.answers);
        } else {
          toast({
            title: "No quiz results found",
            description: "Please complete the quiz first.",
            variant: "destructive",
          });
          navigate("/quiz");
        }
      } catch (error: any) {
        console.error("Error fetching quiz results:", error);
        toast({
          title: "Error loading results",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchLatestQuiz();
  }, [currentUser, location.state, navigate, toast]);

  const generateProductRecommendations = async (answers: Record<string, any>) => {
    setGenerating(true);
    
    // Set a timeout to show mock recommendations if it takes too long
    let timeoutFired = false;
    const timeoutId = setTimeout(() => {
      timeoutFired = true;
      console.log("Recommendations taking too long, showing mock data");
      setRecommendations(getMockRecommendations());
      setGenerating(false);
    }, 8000); // 8 second timeout

    try {
      // Transform quiz answers to match UserQuizAnswers format
      const userQuizAnswers: UserQuizAnswers = {
        hairType: answers.thickness === "Fine" ? "straight" : answers.thickness === "Medium" ? "wavy" : "curly",
        porosity: (answers.porosity?.toLowerCase() || "medium") as "low" | "medium" | "high",
        waterType: "neutral",
        concerns: Array.isArray(answers.concerns) ? answers.concerns : [],
        preferences: {
          vegan: Array.isArray(answers.productQualities) && answers.productQualities.includes("Vegan / cruelty-free"),
          crueltyFree: Array.isArray(answers.productQualities) && answers.productQualities.includes("Vegan / cruelty-free"),
          organic: Array.isArray(answers.productQualities) && answers.productQualities.includes("Organic or natural ingredients"),
          fragranceFree: Array.isArray(answers.productQualities) && answers.productQualities.includes("Fragrance-free"),
        },
        allergens: Array.isArray(answers.allergies) ? answers.allergies.filter((a: string) => a !== "None") : [],
        budget: answers.budget === "< 15$" ? "low" : answers.budget === "16$-35$" ? "medium" : answers.budget === "36$-59$" ? "high" : "medium",
      };

      const result = await generateRecommendations(userQuizAnswers, currentUser?.uid);
      clearTimeout(timeoutId);
      if (!timeoutFired) {
        setRecommendations(result.recommendations || []);
        setGenerating(false);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (!timeoutFired) {
        console.error("Error generating recommendations:", error);
        toast({
          title: "Error generating recommendations",
          description: "Showing sample recommendations. Please try again later.",
          variant: "destructive",
        });
        // Show mock recommendations as fallback
        setRecommendations(getMockRecommendations());
        setGenerating(false);
      }
    }
  };

  const getMockRecommendations = () => [
    {
      product: {
        name: "Hydrating Leave-In",
        brand: "EcoHair",
      },
      aiExplanation: "Deep moisture for dry curls",
      scoreBreakdown: {
        tagMatch: 85,
        sustainability: 80,
        ingredientSafety: 90,
      },
    },
    {
      product: {
        name: "Curl Defining Cream",
        brand: "NaturalCurls",
      },
      aiExplanation: "Enhances pattern without weight",
      scoreBreakdown: {
        tagMatch: 80,
        sustainability: 75,
        ingredientSafety: 85,
      },
    },
    {
      product: {
        name: "Deep Conditioning Mask",
        brand: "CurlCare",
      },
      aiExplanation: "Weekly moisture boost",
      scoreBreakdown: {
        tagMatch: 75,
        sustainability: 70,
        ingredientSafety: 80,
      },
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Generating personalized recommendations...</p>
        </div>
      </div>
    );
  }

  const hairProfile = quizAnswers ? {
    thickness: quizAnswers.thickness || "Not specified",
    porosity: quizAnswers.porosity || "Not specified",
    shampoo: quizAnswers.shampoo || "Not specified",
  } : null;

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Your Hair Profile</h1>
          <p className="text-muted-foreground text-lg">Personalized recommendations just for you</p>
        </div>

        {hairProfile && (
          <Card className="p-6 md:p-8 mb-8 bg-card border-border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <Wind className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground mb-1">Thickness</p>
                <p className="text-lg font-light">{hairProfile.thickness}</p>
              </div>
              <div className="text-center p-4">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground mb-1">Porosity</p>
                <p className="text-lg font-light">{hairProfile.porosity}</p>
              </div>
              <div className="text-center p-4">
                <Droplets className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground mb-1">Shampoo Frequency</p>
                <p className="text-lg font-light">{hairProfile.shampoo}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-6 mb-8">
          <h2 className="text-3xl text-foreground">Recommended for you</h2>
          
          {recommendations.length === 0 ? (
            <Card className="p-8 text-center bg-card border-border shadow-sm">
              <p className="text-muted-foreground">No recommendations available yet. Please try again.</p>
            </Card>
          ) : (
            recommendations.map((item: any, index: number) => {
              const product = item.product || item;
              const productName = product.name || product.productName || "Unknown Product";
              const brand = product.brand || product.brandName || "";
              const explanation = item.aiExplanation || item.explanation || item.reason || "This product matches your hair profile.";
              const scoreBreakdown = item.scoreBreakdown || {};
              
              return (
                <Card key={index} className="p-6 md:p-8 bg-card border-border shadow-sm slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl text-foreground">{productName}</h3>
                        {item.finalRank && (
                          <Badge variant="secondary">#{item.finalRank}</Badge>
                        )}
                      </div>
                      {brand && (
                        <p className="text-muted-foreground mb-2">{brand}</p>
                      )}
                      <p className="text-muted-foreground">{explanation}</p>
                    </div>

                    {Object.keys(scoreBreakdown).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-border">
                        {scoreBreakdown.tagMatch !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Tag Match</p>
                            <p className="text-sm font-medium">{Math.round(scoreBreakdown.tagMatch)}%</p>
                          </div>
                        )}
                        {scoreBreakdown.sustainability !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Sustainability</p>
                            <p className="text-sm font-medium">{Math.round(scoreBreakdown.sustainability)}%</p>
                          </div>
                        )}
                        {scoreBreakdown.ingredientSafety !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Safety</p>
                            <p className="text-sm font-medium">{Math.round(scoreBreakdown.ingredientSafety)}%</p>
                          </div>
                        )}
                        {scoreBreakdown.reviewSentiment !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Reviews</p>
                            <p className="text-sm font-medium">{Math.round(scoreBreakdown.reviewSentiment)}%</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/community")}>
            See community reviews
          </Button>
          <Button className="flex-1" onClick={() => navigate("/routine")}>
            Build my routine
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default Results;
