import { Star, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const Community = () => {
  const navigate = useNavigate();

  const reviews = [
    {
      initials: "AS",
      rating: 5,
      product: "Hydrating Leave-In",
      comment: "Perfect for my 3B curls. Doesn't weigh hair down.",
      helpful: 24,
    },
    {
      initials: "MK",
      rating: 5,
      product: "Curl Defining Cream",
      comment: "Beautiful curl definition without crunch.",
      helpful: 18,
    },
    {
      initials: "LR",
      rating: 4,
      product: "Deep Conditioning Mask",
      comment: "Great moisture boost. Use weekly for best results.",
      helpful: 31,
    },
    {
      initials: "TC",
      rating: 5,
      product: "Hydrating Leave-In",
      comment: "Game changer for low porosity hair.",
      helpful: 15,
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Community Insights</h1>
          <p className="text-muted-foreground text-lg">Real experiences from people with similar hair</p>
        </div>

        <div className="space-y-4 mb-8">
          {reviews.map((review, index) => (
            <Card key={index} className="p-6 bg-card border-border shadow-sm slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-light text-foreground">{review.initials}</span>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <Badge variant="secondary">{review.product}</Badge>
                  </div>

                  <p className="text-foreground">{review.comment}</p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{review.helpful} found this helpful</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button variant="outline" className="w-full" onClick={() => navigate("/results")}>
          Back to recommendations
        </Button>
      </div>
    </div>
  );
};

export default Community;
