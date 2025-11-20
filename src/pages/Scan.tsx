import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Camera, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { hasUserCompletedQuiz } from "../lib/quizUtils";
import { CameraCapture } from "../components/CameraCapture";
import { useYolo } from "../hooks/useYolo";

const Scan = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Load YOLO model
  const { session, runModel } = useYolo("/models/yolov8n-cls.onnx");

  // Simple label list for classification
  // (Replace with your actual hair type labels)
  const labels = ["Straight", "Wavy", "Curly", "Coily", "Dreadlocks"];

  // Redirect user if quiz is already done
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const checkQuizStatus = async () => {
      try {
        const hasCompleted = await hasUserCompletedQuiz(currentUser.uid);
        if (hasCompleted) navigate("/results");
      } catch (error) {
        console.error("Error checking quiz status:", error);
      }
    };

    // setTimeout(checkQuizStatus, 100);
  }, [currentUser, navigate]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ---- YOLO CLASSIFICATION ----
  const handleAnalyze = async () => {
    if (!selectedImage || !session) {
      console.log("Model not ready or image missing");
      return;
    }

    // Convert image to ImageData
    const img = new Image();
    img.src = selectedImage;

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      console.log("Running YOLO...");
      const output = await runModel(imageData);

      if (!output) {
        console.error("YOLO returned null");
        return;
      }

      // YOLOv8 CLS = classification → output looks like: { logits: Tensor }
      const raw = output[Object.keys(output)[0]].data as Float32Array;

      console.log("Raw model output:", raw);

      // Argmax to find highest probability class
      let maxIndex = 0;
      for (let i = 1; i < raw.length; i++) {
        if (raw[i] > raw[maxIndex]) maxIndex = i;
      }

      const predictedClass = labels[maxIndex];
      const confidence = raw[maxIndex];
      
      console.log("raw length:", raw.length);
      console.log("labels length:", labels.length);
      console.log("YOLO output:", output);
      console.log("Output keys:", Object.keys(output));

      console.log("Predicted class:", predictedClass, "Confidence:", confidence);

      // Navigate with YOLO results
      navigate("/quiz", {
        state: {
          image: selectedImage,
          hairType: predictedClass,
          confidence: confidence
        }
      });
    };
  };

  if (!currentUser) return null;

  return (
    <Layout>
      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => setSelectedImage(dataUrl)}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto fade-in">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Hair Analysis</h1>
            <p className="text-muted-foreground text-lg">
              Upload a photo to begin your personalized hair journey
            </p>
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
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCamera(true)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take a photo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 slide-up">
                <div className="rounded-2xl overflow-hidden border border-border">
                  <img
                    src={selectedImage}
                    alt="Uploaded hair"
                    className="w-full h-auto"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedImage(null)}
                  >
                    Upload different photo
                  </Button>

                  {/* Analyze triggers YOLO */}
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
