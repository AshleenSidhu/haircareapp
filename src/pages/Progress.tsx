import { useState } from "react";
import { Upload, TrendingUp } from "lucide-react";
import { Button } from "components/ui/button";
import { Card } from "components/ui/card";
import { Checkbox } from "components/ui/checkbox";
import { Label } from "components/ui/label";

const Progress = () => {
  const [improvements, setImprovements] = useState<string[]>([]);

  const checkInQuestions = [
    "More curl definition?",
    "Less frizz?",
    "Better moisture retention?",
    "Less breakage?",
    "Healthier scalp?",
  ];

  const handleToggle = (question: string) => {
    setImprovements((prev) =>
      prev.includes(question)
        ? prev.filter((q) => q !== question)
        : [...prev, question]
    );
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Track Your Progress</h1>
          <p className="text-muted-foreground text-lg">See how your hair journey is evolving</p>
        </div>

        <Card className="p-6 md:p-8 mb-8 bg-card border-border shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-2xl text-foreground">Weekly Check-In</h2>
          </div>

          <div className="space-y-4 mb-8">
            {checkInQuestions.map((question) => (
              <Label
                key={question}
                className="flex items-center space-x-3 p-4 rounded-xl border border-border hover:border-primary transition-colors cursor-pointer"
              >
                <Checkbox
                  checked={improvements.includes(question)}
                  onCheckedChange={() => handleToggle(question)}
                />
                <span className="text-lg">{question}</span>
              </Label>
            ))}
          </div>

          <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary transition-colors">
            <input
              type="file"
              id="progress-photo"
              accept="image/*"
              className="hidden"
            />
            <label htmlFor="progress-photo" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-foreground mb-1">Upload progress photo</p>
              <p className="text-sm text-muted-foreground">Track visual changes over time</p>
            </label>
          </div>
        </Card>

        <Card className="p-6 bg-primary/10 border-primary/20 mb-6">
          <p className="text-sm text-center text-foreground/80">
            Based on your progress, we may update your recommendations to better suit your hair's evolving needs.
          </p>
        </Card>

        <Button className="w-full">Save Check-In</Button>
      </div>
    </div>
  );
};

export default Progress;
