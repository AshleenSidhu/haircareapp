import { useEffect } from 'react';
import { NavBar } from '../components/NavBar';
import { useScrollSpy } from '../hooks/useScrollSpy';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  BookOpen, 
  Heart, 
  Users, 
  Target, 
  Mail, 
  Phone, 
  MessageSquare 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sectionIds = ['home', 'tips', 'about', 'contact'];

export default function SinglePage() {
  const navigate = useNavigate();
  const { activeSection, scrollToSection } = useScrollSpy({ sectionIds });

  // Handle initial hash on mount (SSR-friendly)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && sectionIds.includes(hash)) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        scrollToSection(hash);
      }, 100);
    }
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar activeSection={activeSection} onNavClick={scrollToSection} />

      {/* Home Section */}
      <section id="home" className="min-h-screen flex items-center pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4 w-full">
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

          {/* Features */}
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-8 bg-card border-border shadow-sm slide-up">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl mb-3 text-foreground">Smart Analysis</h3>
                <p className="text-muted-foreground">
                  Upload a photo and get instant insights into your curl pattern, density, and moisture needs
                </p>
              </Card>

              <Card className="p-8 bg-card border-border shadow-sm slide-up" style={{ animationDelay: "100ms" }}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl mb-3 text-foreground">Curated Products</h3>
                <p className="text-muted-foreground">
                  Personalized recommendations based on your unique hair profile and preferences
                </p>
              </Card>

              <Card className="p-8 bg-card border-border shadow-sm slide-up" style={{ animationDelay: "200ms" }}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl mb-3 text-foreground">Expert Guidance</h3>
                <p className="text-muted-foreground">
                  Connect with curl specialists for personalized advice and styling techniques
                </p>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-4xl mx-auto px-4 py-20">
            <Card className="p-12 md:p-16 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 text-center">
              <h2 className="text-3xl md:text-4xl mb-4 text-foreground">
                Ready to transform your hair care routine?
              </h2>
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
      </section>

      {/* Tips Section */}
      <section id="tips" className="min-h-screen py-20 pt-32">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 fade-in">
            <h2 className="text-4xl md:text-5xl mb-4 text-foreground">Tips & Articles</h2>
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
      </section>

      {/* About Section */}
      <section id="about" className="min-h-screen py-20 pt-32">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16 fade-in">
            <h2 className="text-4xl md:text-5xl mb-4 text-foreground">About Us</h2>
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
      </section>

      {/* Contact Section */}
      <section id="contact" className="min-h-screen py-20 pt-32">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12 fade-in">
            <h2 className="text-4xl md:text-5xl mb-4 text-foreground">Get in Touch</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions? We'd love to hear from you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1 text-foreground">Email</h3>
                    <p className="text-muted-foreground">hello@haircare.com</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1 text-foreground">Phone</h3>
                    <p className="text-muted-foreground">+1 (555) 123-4567</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1 text-foreground">Support</h3>
                    <p className="text-muted-foreground">Available Mon-Fri, 9am-5pm EST</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-8">
              <h3 className="text-2xl mb-6 text-foreground">Send us a message</h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" className="mt-1.5" />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" className="mt-1.5" />
                </div>
                
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="How can we help you?" 
                    rows={5}
                    className="mt-1.5"
                  />
                </div>
                
                <Button type="submit" className="w-full">Send Message</Button>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

