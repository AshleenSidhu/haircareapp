import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Camera, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { hasUserCompletedQuiz } from "../lib/quizUtils";

const Scan = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Check if user has already completed quiz (non-blocking)
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Check in background without blocking UI
    const checkQuizStatus = async () => {
      try {
        const hasCompleted = await hasUserCompletedQuiz(currentUser.uid);
        if (hasCompleted) {
          // Only redirect if user hasn't started uploading
          navigate("/results");
        }
      } catch (error) {
        console.error("Error checking quiz status:", error);
        // Don't block UI on error
      }
    };

    // Use a small timeout to allow UI to render first
    const timeoutId = setTimeout(checkQuizStatus, 100);
    return () => clearTimeout(timeoutId);
  }, [currentUser, navigate]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    // In a real app, this would send to AI analysis
    navigate("/quiz", { state: { image: selectedImage } });
  };

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Hair Analysis</h1>
          <p className="text-muted-foreground text-lg">Upload a photo to begin your personalized hair journey</p>
        </div>

        <Card className="p-8 md:p-12 bg-card border-border shadow-sm">
          {!selectedImage ? (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg mb-2 text-foreground">Drop your photo here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </label>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">or</p>
                <Button variant="outline" className="w-full" onClick={() => {}}>
                  <Camera className="w-4 h-4 mr-2" />
                  Take a photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 slide-up">
              <div className="rounded-2xl overflow-hidden border border-border">
                <img src={selectedImage} alt="Uploaded hair" className="w-full h-auto" />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedImage(null)}
                >
                  Upload different photo
                </Button>
                <Button className="flex-1" onClick={handleAnalyze}>
                  Analyze
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Your photo is analyzed privately and never shared
          </p>
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default Scan;
