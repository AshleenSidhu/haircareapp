import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

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
      "Sink to the bottom",
      "Float somewhere in the middle",
      "Float on top"
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
    subtitle: "(dryer, straightener, curling iron)",
    type: "single",
    options: ["Never", "Less than once a month", "Once a month", "Once a week", "Every day"]
  },
  {
    id: "prioritize",
    question: "Ingredients you prefer to prioritize:",
    type: "text"
  },
  {
    id: "avoid",
    question: "Ingredients to avoid (select all that apply):",
    type: "multi",
    options: ["Sulphates", "Parabens", "Mineral oils", "Silicones", "Alcohols"]
  },
  {
    id: "allergies",
    question: "Do you have any allergies or sensitivities to specific ingredients?",
    type: "text"
  },
  {
    id: "budget",
    question: "What is your budget range for hair care products?",
    type: "single",
    options: ["$", "$$", "$$$", "$$$$", "N/A"]
  },
  {
    id: "brandAvoid",
    question: "Are there any brands you avoid using?",
    type: "text"
  },
  {
    id: "nonNegotiable",
    question: "Non-negotiable products in your regimen?",
    type: "text"
  },
  {
    id: "concerns",
    question: "What is your biggest hair concern? (select all that apply)",
    type: "multi",
    options: ["Dry", "Colour treated", "Damaged", "Chemically treated", "Frizz", "Bleached", "Breakage", "Curl definition", "Scalp (dry, oily, flaky)", "Lack of volume", "Hair loss"]
  }
];

const Quiz = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

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

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Save quiz results to Firestore
      try {
        await addDoc(collection(db, "quizResults"), {
          userId: currentUser?.uid,
          answers,
          timestamp: new Date()
        });
        toast({
          title: "Quiz completed!",
          description: "Your results have been saved."
        });
        navigate("/results");
      } catch (error: any) {
        toast({
          title: "Error saving results",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const currentAnswer = answers[questions[currentQuestion].id];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const q = questions[currentQuestion];
  
  const isAnswered = () => {
    if (q.type === "multi") {
      return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    }
    return !!currentAnswer && (typeof currentAnswer !== 'string' || currentAnswer.trim() !== '');
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
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
            <p className="text-sm text-muted-foreground mb-8">{q.subtitle}</p>
          )}

          {q.type === "single" && (
            <>
              {q.helperPrompt && (
                <p className="text-sm text-muted-foreground mb-6 italic">{q.helperPrompt}</p>
              )}
              <RadioGroup value={currentAnswer as string} onValueChange={handleAnswer}>
                <div className="space-y-4">
                  {q.options?.map((option, idx) => (
                    <div key={option}>
                      <Label
                        htmlFor={option}
                        className="flex items-center space-x-3 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors cursor-pointer"
                      >
                        <RadioGroupItem value={option} id={option} />
                        <span className="text-lg">{option}</span>
                      </Label>
                      {q.helpers && q.helpers[idx] && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground ml-11 mt-2 hover:text-foreground transition-colors">
                            <Info className="w-3 h-3" />
                            Helper
                          </CollapsibleTrigger>
                          <CollapsibleContent className="text-xs text-muted-foreground ml-11 mt-1">
                            {q.helpers[idx]}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </>
          )}

          {q.type === "multi" && (
            <div className="space-y-4">
              {q.options?.map((option) => (
                <Label
                  key={option}
                  htmlFor={option}
                  className="flex items-center space-x-3 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors cursor-pointer"
                >
                  <Checkbox
                    id={option}
                    checked={Array.isArray(currentAnswer) && currentAnswer.includes(option)}
                    onCheckedChange={() => handleMultiSelect(option)}
                  />
                  <span className="text-lg">{option}</span>
                </Label>
              ))}
            </div>
          )}

          {q.type === "text" && (
            <Input
              placeholder="Type your answer..."
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
              disabled={!isAnswered()}
              className="flex-1"
            >
              {currentQuestion === questions.length - 1 ? "See results" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Quiz;
