import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

const Tips = () => {
  return (
    <Layout showBackButton>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12 fade-in">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Tips & Articles</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Expert advice and guides for your hair care journey
          </p>
        </div>

        <div className="space-y-6">
          {[
            {
              title: "Understanding Your Hair Porosity",
              excerpt: "Learn how to determine your hair's porosity level and why it matters for product selection.",
              readTime: "5 min read"
            },
            {
              title: "The Complete Guide to Hair Moisture",
              excerpt: "Discover the secrets to keeping your hair hydrated and healthy all year round.",
              readTime: "8 min read"
            },
            {
              title: "Heat Styling: Best Practices",
              excerpt: "Protect your hair while achieving your desired look with these expert tips.",
              readTime: "6 min read"
            },
            {
              title: "Natural Ingredients for Healthy Hair",
              excerpt: "Explore beneficial natural ingredients and how they can transform your routine.",
              readTime: "7 min read"
            }
          ].map((article, i) => (
            <Card key={i} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48 h-32 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-12 h-12 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl mb-2 text-foreground">{article.title}</h3>
                  <p className="text-muted-foreground mb-4">{article.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{article.readTime}</span>
                    <Button variant="outline">Read Article</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Tips;
