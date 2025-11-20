import { useNavigate } from "react-router-dom";
import { Sun, Moon, Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Layout } from "../components/Layout";

const Routine = () => {
  const navigate = useNavigate();

  const routineSteps = {
    morning: [
      { step: "Refresh curls with water spray", time: "1 min" },
      { step: "Apply leave-in conditioner", time: "2 min" },
      { step: "Scrunch in curl cream", time: "2 min" },
    ],
    evening: [
      { step: "Apply light hair oil to ends", time: "1 min" },
      { step: "Pineapple or silk bonnet", time: "2 min" },
    ],
    weekly: [
      { step: "Deep conditioning mask", time: "30 min" },
      { step: "Scalp massage with oil", time: "10 min" },
    ],
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto fade-in">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Your Routine</h1>
          <p className="text-muted-foreground text-lg">A simple schedule tailored to your hair</p>
        </div>

        <div className="space-y-6 mb-8">
          <Card className="p-6 md:p-8 bg-card border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Sun className="w-6 h-6 text-primary" />
              <h2 className="text-2xl text-foreground">Morning</h2>
            </div>
            <div className="space-y-4">
              {routineSteps.morning.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-4 rounded-xl bg-muted/50">
                  <span className="text-foreground">{item.step}</span>
                  <Badge variant="secondary">{item.time}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 md:p-8 bg-card border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Moon className="w-6 h-6 text-primary" />
              <h2 className="text-2xl text-foreground">Evening</h2>
            </div>
            <div className="space-y-4">
              {routineSteps.evening.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-4 rounded-xl bg-muted/50">
                  <span className="text-foreground">{item.step}</span>
                  <Badge variant="secondary">{item.time}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 md:p-8 bg-card border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-6 h-6 text-primary" />
              <h2 className="text-2xl text-foreground">Weekly</h2>
            </div>
            <div className="space-y-4">
              {routineSteps.weekly.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-4 rounded-xl bg-muted/50">
                  <span className="text-foreground">{item.step}</span>
                  <Badge variant="secondary">{item.time}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
            Start over
          </Button>
          <Button className="flex-1" onClick={() => navigate("/progress")}>
            Track progress
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <Card className="mt-8 p-6 bg-primary/10 border-primary/20">
          <p className="text-center text-sm text-foreground/80">
            ✿ Gentle reminder: Consistency is key to seeing results
          </p>
        </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Routine;
