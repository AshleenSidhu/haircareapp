import { useNavigate } from "react-router-dom";
import { Droplets, Wind, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const Results = () => {
  const navigate = useNavigate();

  const hairProfile = {
    pattern: "3B curls",
    density: "Medium density",
    moisture: "Low moisture",
  };

  const recommendations = [
    {
      name: "Hydrating Leave-In",
      reason: "Deep moisture for dry curls",
      tip: "Apply to damp hair, scrunch upward",
      highlight: "Shea butter + aloe vera",
    },
    {
      name: "Curl Defining Cream",
      reason: "Enhances pattern without weight",
      tip: "Use on wet hair before diffusing",
      highlight: "Lightweight, no silicones",
    },
    {
      name: "Deep Conditioning Mask",
      reason: "Weekly moisture boost",
      tip: "Leave on for 20 minutes with heat",
      highlight: "Protein-free formula",
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Your Hair Profile</h1>
          <p className="text-muted-foreground text-lg">Personalized recommendations just for you</p>
        </div>

        <Card className="p-6 md:p-8 mb-8 bg-card border-border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <Wind className="w-8 h-8 mx-auto mb-3 text-primary" />
              <p className="text-lg font-light">{hairProfile.pattern}</p>
            </div>
            <div className="text-center p-4">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
              <p className="text-lg font-light">{hairProfile.density}</p>
            </div>
            <div className="text-center p-4">
              <Droplets className="w-8 h-8 mx-auto mb-3 text-primary" />
              <p className="text-lg font-light">{hairProfile.moisture}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-6 mb-8">
          <h2 className="text-3xl text-foreground">Recommended for you</h2>
          
          {recommendations.map((product, index) => (
            <Card key={index} className="p-6 md:p-8 bg-card border-border shadow-sm slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl mb-2 text-foreground">{product.name}</h3>
                  <p className="text-muted-foreground">{product.reason}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="mt-0.5">How to use</Badge>
                    <p className="text-sm">{product.tip}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">Key ingredients</Badge>
                    <p className="text-sm">{product.highlight}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
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
  );
};

export default Results;
