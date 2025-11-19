/**
 * User Dashboard - Overview of quiz results, recommendations, and progress
 */

import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Layout } from "../components/Layout";
import { Sparkles, TrendingUp, Calendar, ArrowRight, Heart, Leaf } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { ProductDetails } from "../components/ProductDetails";
import { LikedProduct } from "../lib/types/products";
import { fetchLikedProducts } from "../lib/utils/products";

interface QuizResult {
  id: string;
  answers: Record<string, any>;
  timestamp: any;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [likedProducts, setLikedProducts] = useState<LikedProduct[]>([]);
  const [loadingLiked, setLoadingLiked] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    const fetchQuizResults = async () => {
      if (!currentUser) return;

      try {
        const quizResultsRef = collection(db, "quizResults");
        const q = query(
          quizResultsRef,
          where("userId", "==", currentUser.uid),
          orderBy("timestamp", "desc"),
          limit(5)
        );

        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as QuizResult[];

        setQuizResults(results);
        setHasCompleted(results.length > 0);
      } catch (error) {
        console.error("Error fetching quiz results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizResults();
  }, [currentUser]);

  useEffect(() => {
    const fetchLiked = async () => {
      if (!currentUser) return;
      try {
        setLoadingLiked(true);
        const liked = await fetchLikedProducts(currentUser.uid);
        setLikedProducts(liked);
      } catch (error) {
        console.error("Error fetching liked products:", error);
      } finally {
        setLoadingLiked(false);
      }
    };
    fetchLiked();
  }, [currentUser]);

  const getLatestResult = () => {
    if (quizResults.length === 0) return null;
    return quizResults[0];
  };

  const latestResult = getLatestResult();

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto fade-in">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl mb-2 text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Welcome back, {currentUser?.email}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-card border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
              <Badge variant="secondary">Active</Badge>
            </div>
            <h3 className="text-2xl font-light mb-1">{quizResults.length}</h3>
            <p className="text-sm text-muted-foreground">Quiz Results</p>
          </Card>

          <Card className="p-6 bg-card border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-light mb-1">
              {latestResult ? "Complete" : "Not Started"}
            </h3>
            <p className="text-sm text-muted-foreground">Latest Profile</p>
          </Card>

          <Card className="p-6 bg-card border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-light mb-1">
              {latestResult
                ? new Date(latestResult.timestamp?.toDate?.() || latestResult.timestamp).toLocaleDateString()
                : "N/A"}
            </h3>
            <p className="text-sm text-muted-foreground">Last Updated</p>
          </Card>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        ) : latestResult ? (
          <Card className="p-8 bg-card border-border shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-foreground">Your Latest Quiz Results</h2>
              <Button onClick={() => navigate("/results")}>
                View Full Results
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Hair Type</h3>
                <p className="text-lg">
                  {latestResult.answers.thickness || "Not specified"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Porosity</h3>
                <p className="text-lg">
                  {latestResult.answers.porosity || "Not specified"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Budget</h3>
                <p className="text-lg">
                  {latestResult.answers.budget || "Not specified"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Concerns</h3>
                <p className="text-lg">
                  {Array.isArray(latestResult.answers.concerns)
                    ? latestResult.answers.concerns.join(", ")
                    : "None"}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center bg-card border-border shadow-sm">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
            <h2 className="text-2xl mb-4 text-foreground">No Quiz Results Yet</h2>
            <p className="text-muted-foreground mb-6">
              Complete the quiz to get personalized recommendations
            </p>
            <Button onClick={() => navigate("/scan")}>
              Take Quiz
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 bg-card border-border shadow-sm">
            <h3 className="text-xl mb-4 text-foreground">Quick Actions</h3>
            <div className="space-y-3">
              {!hasCompleted && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/scan")}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Take Quiz
                </Button>
              )}
              {hasCompleted && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/results")}
                >
                  View Results
                </Button>
              )}
              {hasCompleted && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/scan")}
                >
                  Retake Quiz
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/routine")}
              >
                My Routine
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/progress")}
              >
                Progress Tracking
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border shadow-sm">
            <h3 className="text-xl mb-4 text-foreground">Recent Activity</h3>
            {quizResults.length > 0 ? (
              <div className="space-y-3">
                {quizResults.slice(0, 3).map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">Quiz Completed</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.timestamp?.toDate?.() || result.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate("/results")}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </Card>
        </div>

        {/* Liked Products Section */}
        <Card className="p-6 bg-card border-border shadow-sm mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Liked Products
            </h3>
            {likedProducts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/products")}
              >
                View All Products
              </Button>
            )}
          </div>

          {loadingLiked ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading liked products...</p>
            </div>
          ) : likedProducts.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No liked products yet</p>
              <Button variant="outline" onClick={() => navigate("/products")}>
                Browse Products
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {likedProducts.map((likedProduct) => (
                <Card
                  key={likedProduct.productId}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedProduct(likedProduct.product)}
                >
                  <div className="w-full h-32 bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {likedProduct.product.imageUrl ? (
                      <img
                        src={likedProduct.product.imageUrl}
                        alt={likedProduct.product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Sparkles className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <h4 className="font-semibold mb-1 text-foreground line-clamp-1">
                    {likedProduct.product.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {likedProduct.product.brand}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {likedProduct.product.sustainability.ecoFriendly && (
                      <Badge variant="secondary" className="text-xs">
                        <Leaf className="w-3 h-3 mr-1" />
                        Eco
                      </Badge>
                    )}
                    {likedProduct.product.sustainability.crueltyFree && (
                      <Badge variant="secondary" className="text-xs">
                        Cruelty-Free
                      </Badge>
                    )}
                    {likedProduct.product.reviews && likedProduct.product.reviews.averageRating > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        ⭐ {likedProduct.product.reviews.averageRating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
        </div>
      </div>

      {/* Product Details Modal */}
      <ProductDetails
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />
    </Layout>
  );
};

export default Dashboard;

