import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, ArrowLeft, Info, Upload, Camera } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useToast } from "../hooks/use-toast";
import { hasUserCompletedQuiz } from "../lib/quizUtils";

const questions = [
  {
    id: "thickness",
    question: "Your hair is:",
    type: "single",
    options: ["Fine", "Medium", "Thick"],
    helpers: [
      "You barely feel a strand of hair between your fingers",
      "You feel a strand of hair between your fingers",
      "You definitely feel a strand of hair between your fingers"
    ]
  },
  {
    id: "porosity",
    question: "Your porosity level is:",
    type: "single",
    options: ["Low", "Medium", "High"],
    helperPrompt: "If you drop a single strand of hair in a glass of water, does it…?",
    helpers: [
      "Float on top",
      "Float somewhere in the middle",
      "Sink to the bottom"
    ]
  },
  {
    id: "shampoo",
    question: "You shampoo your hair:",
    type: "single",
    options: ["Less than once a month", "Once a week", "Two to three times a week", "Every day"]
  },
  {
    id: "heat",
    question: "Do you use heat styling tools?",
    subtitle: "dryer, straightener, curling iron",
    type: "single",
    options: ["Never", "Less than once a month", "Once a month", "Once a week", "Every day"]
  },
  {
    id: "allergies",
    question: "Do you have any allergies or sensitivities to specific ingredients?",
    subtitle: "select all that apply",
    type: "multi",
    options: [
      "None",
      "Shea butter",
      "Almond oil / sweet almond oil",
      "Macadamia oil",
      "Argan oil",
      "Brazil nut oil",
      "Peanut oil",
      "Coconut oil",
      "Sesame oil",
      "Sunflower seed oil",
      "Flaxseed / linseed extract",
      "Pumpkin seed oil",
      "Avocado oil / butter",
      "Banana extract",
      "Citrus oils (orange, lemon, bergamot, grapefruit)",
      "Strawberry extract",
      "Papaya enzymes",
      "Lavender",
      "Peppermint / menthol",
      "Tea tree oil",
      "Rosemary",
      "Chamomile",
      "Eucalyptus",
      "Jasmine",
      "Ylang-ylang",
      "Clove",
      "Sage",
      "Calendula",
      "Synthetic fragrance blends",
      "Essential oils",
      "Other"
    ]
  },
  {
    id: "budget",
    question: "What is your budget range for hair care products?",
    type: "single",
    options: ["< 15$", "16$-35$", "36$-59$", "> 60$", "Show me all the options"]
  },
  {
    id: "brandAvoid",
    question: "Are there any brands you avoid using?",
    type: "text"
  },
  {
    id: "concerns",
    question: "What is your biggest hair concern?",
    subtitle: "select all that apply",
    type: "multi",
    options: ["Dry", "Colour treated", "Damaged", "Chemically treated", "Frizz", "Bleached", "Breakage", "Curl definition", "Scalp (dry, oily, flaky)", "Lack of volume", "Hair loss"]
  },
  {
    id: "productQualities",
    question: "When choosing a hair product, what qualities matter most to you?",
    subtitle: "select all that apply",
    type: "multi",
    options: [
      "Fragrance-free",
      "Clean or non-toxic ingredients",
      "Silicone-free",
      "Sulfate-free",
      "Paraben-free",
      "Alcohol-free",
      "Protein-free",
      "Organic or natural ingredients",
      "Vegan / cruelty-free",
      "Locally made brands",
      "POC-owned / women-owned brands",
      "Sustainable or eco-friendly",
      "Dermatologist-tested",
      "Price",
      "Scent / fragrance",
      "Packaging",
      "Other"
    ]
  }
];

const Quiz = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(-1); // -1 means picture upload step
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [otherAllergyText, setOtherAllergyText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(location.state?.image || null);
  const [saving, setSaving] = useState(false);
  const [hasCompletedQuizBefore, setHasCompletedQuizBefore] = useState(false);

  // Check if user has already completed quiz (non-blocking)
  // Only check on initial load, not when user is actively taking the quiz
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Only check if user hasn't started answering questions yet
    if (currentQuestion === -1 && Object.keys(answers).length === 0) {
      // Check in background without blocking UI
      const checkQuizStatus = async () => {
        try {
          const hasCompleted = await hasUserCompletedQuiz(currentUser.uid);
          setHasCompletedQuizBefore(hasCompleted);
          if (hasCompleted) {
            navigate("/results");
            return;
          }
        } catch (error) {
          console.error("Error checking quiz status:", error);
        }
      };

      // Use a small timeout to allow UI to render first
      const timeoutId = setTimeout(checkQuizStatus, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [currentUser, navigate, currentQuestion, answers]);

  // If image is passed from Scan page, skip to first question
  useEffect(() => {
    if (selectedImage && currentQuestion === -1) {
      setCurrentQuestion(0);
    }
  }, [selectedImage, currentQuestion]);

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

  const handleImageNext = () => {
    if (selectedImage) {
      setCurrentQuestion(0);
    }
  };

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value });
  };

  const handleMultiSelect = (value: string) => {
    const currentAnswers = (answers[questions[currentQuestion].id] as string[]) || [];
    const newAnswers = currentAnswers.includes(value)
      ? currentAnswers.filter(v => v !== value)
      : [...currentAnswers, value];
    setAnswers({ ...answers, [questions[currentQuestion].id]: newAnswers });
  };

  const handleTextChange = (value: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Save quiz results to Firestore
      if (saving) return; // Prevent double submission
      
      setSaving(true);
      
      // Include "Other" allergy text if provided
      const finalAnswers = { ...answers };
      if (otherAllergyText && Array.isArray(finalAnswers.allergies) && finalAnswers.allergies.includes("Other")) {
        finalAnswers.allergies = [...finalAnswers.allergies.filter(a => a !== "Other"), `Other: ${otherAllergyText}`];
      }

      // Navigate immediately - don't wait for Firestore save
      navigate("/results", { state: { answers: finalAnswers } });
      
      // Save to Firestore in the background (non-blocking)
      addDoc(collection(db, "quizResults"), {
        userId: currentUser?.uid,
        answers: finalAnswers,
        timestamp: new Date()
      }).then(() => {
        // Success - save completed in background
        console.log("Quiz results saved successfully");
      }).catch((error: any) => {
        // Error - log but don't block user
        console.error("Error saving quiz results:", error);
        // Optionally show a non-intrusive notification
        toast({
          title: "Note: Results saved locally",
          description: "Your results may not be synced yet. They're still available.",
          variant: "default"
        });
      });
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Show UI immediately, check in background
  if (!currentUser) {
    return null; // Will redirect to login
  }

  // Determine if we should show nav bar (only if user has completed quiz before)
  const showNavBar = hasCompletedQuizBefore;

  // Picture upload step (first step)
  if (currentQuestion === -1) {
    const progress = 0;
    return (
      <Layout hideNavigation={!showNavBar} showBackButton={!showNavBar}>
        <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto fade-in">
          <div className="mb-8">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: '#B7A99A' }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Step 1 of {questions.length + 1}: Upload Photo
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-card border-border shadow-sm slide-up">
            <h2 className="text-3xl md:text-4xl mb-4 text-foreground">
              Upload a photo of your hair
            </h2>
            <p className="text-muted-foreground mb-8">
              This helps us analyze your hair type, curl pattern, and provide better recommendations
            </p>

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
                  <Button className="flex-1" onClick={handleImageNext}>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
        </div>
      </Layout>
    );
  }

  const currentAnswer = answers[questions[currentQuestion].id];
  const progress = ((currentQuestion + 1) / (questions.length + 1)) * 100; // +1 for image step
  const q = questions[currentQuestion];
  
  const isAnswered = () => {
    if (q.type === "multi") {
      return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    }
    return !!currentAnswer && (typeof currentAnswer !== 'string' || currentAnswer.trim() !== '');
  };

  return (
    <Layout hideNavigation={!showNavBar} showBackButton={!showNavBar}>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto fade-in">
        <div className="mb-8">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: '#B7A99A' }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>

        <Card className="p-8 md:p-12 bg-card border-border shadow-sm slide-up">
          <h2 className="text-3xl md:text-4xl mb-4 text-foreground">
            {q.question}
          </h2>
          {q.subtitle && (
            <p className="text-sm text-muted-foreground mb-8 italic">{q.subtitle}</p>
          )}

          {q.type === "single" && (
            <>
              {q.helperPrompt && (
                <p className="text-sm text-muted-foreground mb-6 italic">{q.helperPrompt}</p>
              )}
              <TooltipProvider>
                <RadioGroup value={currentAnswer as string} onValueChange={handleAnswer}>
                  <div className="space-y-4">
                    {q.options?.map((option, idx) => (
                      <div key={option} className="flex items-center justify-between p-4 rounded-xl border-2 border-border hover:border-primary transition-colors">
                        <Label
                          htmlFor={option}
                          className="flex items-center space-x-3 flex-1 cursor-pointer"
                        >
                          <RadioGroupItem value={option} id={option} />
                          <span className="text-lg">{option}</span>
                        </Label>
                        {q.helpers && q.helpers[idx] && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-1"
                                onClick={(e) => e.preventDefault()}
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{q.helpers[idx]}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </TooltipProvider>
            </>
          )}

          {q.type === "multi" && (
            <div className="space-y-4">
              {q.options?.map((option) => {
                const match = option.match(/^(.+?)\s*\((.+?)\)$/);
                const mainText = match ? match[1] : option;
                const subText = match ? match[2] : null;
                
                return (
                  <div key={option}>
                    <Label
                      htmlFor={option}
                      className="flex items-center space-x-3 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors cursor-pointer"
                    >
                      <Checkbox
                        id={option}
                        checked={Array.isArray(currentAnswer) && currentAnswer.includes(option)}
                        onCheckedChange={() => handleMultiSelect(option)}
                      />
                      <span className="text-lg">
                        {mainText}
                        {subText && <span className="text-sm italic text-muted-foreground ml-1">({subText})</span>}
                      </span>
                    </Label>
                    {option === "Other" && Array.isArray(currentAnswer) && currentAnswer.includes("Other") && (
                      <Input
                        placeholder="Please specify..."
                        value={otherAllergyText}
                        onChange={(e) => setOtherAllergyText(e.target.value)}
                        className="mt-2 ml-10 text-base"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {q.type === "text" && (
            <Input
              placeholder={q.id === "brandAvoid" ? "Type 'None' if not applicable" : "Type your answer..."}
              value={(currentAnswer as string) || ""}
              onChange={(e) => handleTextChange(e.target.value)}
              className="text-lg p-4"
            />
          )}

          <div className="flex gap-4 mt-12">
            {currentQuestion > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!isAnswered() || saving}
              className="flex-1"
            >
              {saving ? "Saving..." : currentQuestion === questions.length - 1 ? "See results" : "Next"}
              {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Quiz;
