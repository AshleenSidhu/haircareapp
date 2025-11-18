import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Heart, Users, Target } from "lucide-react";

const About = () => {
  return (
    <Layout showBackButton>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-16 fade-in">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">About Us</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're on a mission to help everyone discover their perfect hair care routine
          </p>
        </div>

        <div className="space-y-12">
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Our journey began with a simple observation: hair care is deeply personal, yet most solutions are one-size-fits-all. We believe everyone deserves products and routines tailored to their unique hair type, lifestyle, and goals.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Using advanced AI technology combined with expert knowledge from hair care professionals, we've created a platform that makes personalized hair care accessible to everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-8">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl mb-2 text-foreground">Our Mission</h3>
              <p className="text-muted-foreground">
                Empower individuals with personalized hair care solutions that actually work
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl mb-2 text-foreground">Our Community</h3>
              <p className="text-muted-foreground">
                A supportive space where hair care enthusiasts share knowledge and experiences
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl mb-2 text-foreground">Our Approach</h3>
              <p className="text-muted-foreground">
                Combining AI technology with expert knowledge for accurate recommendations
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;
