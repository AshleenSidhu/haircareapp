import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Calendar } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Layout } from "@/components/Layout";

const Index = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-20 md:py-32">
        <div className="text-center space-y-8 fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">Your personalized hair journey starts here</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl text-foreground max-w-4xl mx-auto leading-tight">
            Discover what your hair truly needs
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered analysis, expert guidance, and a community that understands your curls
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button onClick={() => navigate("/scan")} className="text-lg px-8 py-6">
              Start your analysis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/booking")} className="text-lg px-8 py-6">
              <Calendar className="w-5 h-5 mr-2" />
              Book a stylist
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-8 bg-card border-border shadow-sm slide-up">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl mb-3 text-foreground">Smart Analysis</h3>
            <p className="text-muted-foreground">Upload a photo and get instant insights into your curl pattern, density, and moisture needs</p>
          </Card>

          <Card className="p-8 bg-card border-border shadow-sm slide-up" style={{ animationDelay: "100ms" }}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl mb-3 text-foreground">Curated Products</h3>
            <p className="text-muted-foreground">Personalized recommendations based on your unique hair profile and preferences</p>
          </Card>

          <Card className="p-8 bg-card border-border shadow-sm slide-up" style={{ animationDelay: "200ms" }}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl mb-3 text-foreground">Expert Guidance</h3>
            <p className="text-muted-foreground">Connect with curl specialists for personalized advice and styling techniques</p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <Card className="p-12 md:p-16 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 text-center">
          <h2 className="text-3xl md:text-4xl mb-4 text-foreground">Ready to transform your hair care routine?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands who've discovered their perfect products and routines
          </p>
          <Button onClick={() => navigate("/scan")} className="text-lg px-8 py-6">
            Get started now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Card>
      </div>
      </div>
    </Layout>
  );
};

export default Index;
