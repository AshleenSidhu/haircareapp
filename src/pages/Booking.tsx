import { Calendar, Clock, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Layout } from "../components/Layout";

const Booking = () => {
  const stylists = [
    {
      name: "Alex Rivera",
      specialty: "Curl specialist",
      experience: "8 years",
      available: ["Mon 2pm", "Wed 4pm", "Fri 10am"],
    },
    {
      name: "Jordan Lee",
      specialty: "Textured hair expert",
      experience: "6 years",
      available: ["Tue 1pm", "Thu 3pm", "Sat 11am"],
    },
    {
      name: "Morgan Taylor",
      specialty: "Natural hair care",
      experience: "10 years",
      available: ["Mon 3pm", "Wed 2pm", "Fri 1pm"],
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl mb-4 text-foreground">Book a Consultation</h1>
          <p className="text-muted-foreground text-lg">Get personalized guidance from a hair expert</p>
        </div>

        <Card className="p-6 md:p-8 mb-8 bg-card border-border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <p className="text-foreground">30-minute virtual session</p>
          </div>
          <p className="text-muted-foreground ml-8">Discuss your hair goals, get product recommendations, and learn styling techniques</p>
        </Card>

        <div className="space-y-6">
          {stylists.map((stylist, index) => (
            <Card key={index} className="p-6 md:p-8 bg-card border-border shadow-sm slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl mb-1 text-foreground">{stylist.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{stylist.specialty}</Badge>
                        <Badge>{stylist.experience}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Available times</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stylist.available.map((time, i) => (
                      <Button key={i} className="h-8 text-sm px-3">
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default Booking;
