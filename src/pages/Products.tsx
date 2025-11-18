import { Layout } from "../components/Layout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Sparkles } from "lucide-react";

const Products = () => {
  return (
    <Layout showBackButton>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12 fade-in">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Our Products</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover curated hair care products tailored to your unique needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6 hover:shadow-md transition-shadow">
              <div className="w-full h-48 bg-muted rounded-lg mb-4 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl mb-2 text-foreground">Product Name {i}</h3>
              <p className="text-muted-foreground mb-4">
                Perfect for your hair type and needs
              </p>
              <Button variant="outline" className="w-full">Learn More</Button>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Products;
