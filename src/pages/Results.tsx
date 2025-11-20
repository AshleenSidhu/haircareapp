import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Droplets, Wind, Sparkles, ArrowRight, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { generateRecommendations, UserQuizAnswers } from "../lib/recommendations";
import { useToast } from "../hooks/use-toast";
import { translateToIngredients } from "../components/ingredientTranslation";
import { filterAndScoreProducts } from "../components/productfilter";
import productsDB from "../data/products.json"; // wherever your DB is located

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

    try {
      // Step 1 — Translate quiz answers using your code
      const translated = translateToIngredients({
        hairType: answers.hairType,
        thickness: answers.thickness,
        porosity: answers.porosity,
        shampoo: answers.shampoo,
        heat: answers.heat,
        allergies: answers.allergies || [],
        budget: answers.budget,
        brandAvoid: answers.brandAvoid,
        concerns: answers.concerns || [],
        productQualities: answers.productQualities || []
      });

      console.log("Translated profile:", translated);

      // Step 2 — Filter + score products using your database
      const filteredProducts = filterAndScoreProducts(productsDB, translated);

      console.log("Filtered products:", filteredProducts);

      // Step 3 — Save results (top 10)
      setRecommendations(filteredProducts.slice(0, 4));

    } catch (error: any) {
      console.error("Recommendation error:", error);

      toast({
        title: "Error generating recommendations",
        description: "Showing fallback recommendations.",
        variant: "destructive",
      });

      setRecommendations(getMockRecommendations());
    }

    setGenerating(false);
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
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
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
            recommendations.map((product: any, index: number) => {
              const productName = product.title || "Unknown Product";
              const brand = product.brand || "";
              const explanation =
                product.explanation || "This product matches your hair profile.";
              const scoreBreakdown = product.scoreBreakdown || {};
              const price = product.price ? `$${product.price}` : null;
              const link = product.productPageUrl || null;

              return (
                <Card
                  key={product.id || index}
                  className="p-6 md:p-8 bg-card border-border shadow-sm slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="space-y-6">

                    {/* PRODUCT IMAGE */}
                    {product.imageUrl && (
                      <div className="w-full flex justify-center mb-4">
                        <img
                          src={product.imageUrl}
                          alt={productName}
                          className="w-32 h-32 object-cover rounded-xl shadow-md"
                        />
                      </div>
                    )}

                    {/* NAME, BRAND, PRICE, LINK */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl text-foreground font-semibold">
                          {productName}
                        </h3>

                        {product.finalRank && (
                          <Badge variant="secondary">#{product.finalRank}</Badge>
                        )}
                      </div>

                      {brand && (
                        <p className="text-muted-foreground mb-1 text-sm">{brand}</p>
                      )}

                      {/* PRICE */}
                      {price && (
                        <p className="text-sm font-medium text-primary mb-1">
                          {price}
                        </p>
                      )}

                      {/* PRODUCT LINK */}
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline text-sm"
                        >
                          View product page →
                        </a>
                      )}

                      {/* AI EXPLANATION */}
                      <p className="text-muted-foreground mt-3 text-sm">{explanation}</p>
                    </div>

                    {/* SCORE BREAKDOWN */}
                    {Object.keys(scoreBreakdown).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                        {scoreBreakdown.tagMatch !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Tag Match</p>
                            <p className="text-sm font-medium">
                              {Math.round(scoreBreakdown.tagMatch)}%
                            </p>
                          </div>
                        )}

                        {scoreBreakdown.sustainability !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Sustainability</p>
                            <p className="text-sm font-medium">
                              {Math.round(scoreBreakdown.sustainability)}%
                            </p>
                          </div>
                        )}

                        {scoreBreakdown.ingredientSafety !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Safety</p>
                            <p className="text-sm font-medium">
                              {Math.round(scoreBreakdown.ingredientSafety)}%
                            </p>
                          </div>
                        )}

                        {scoreBreakdown.reviewSentiment !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Reviews</p>
                            <p className="text-sm font-medium">
                              {Math.round(scoreBreakdown.reviewSentiment)}%
                            </p>
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
          <Button onClick={() => navigate("/scan")}>
            Retake analysis
          </Button>
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default Results;
