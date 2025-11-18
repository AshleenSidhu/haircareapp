import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { Layout } from '../components/Layout';
import { ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await resetPassword(email);
      setEmailSent(true);
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 py-20 animate-fade-in">
        <div className="w-full max-w-md">
          {/* Glassmorphism Card */}
          <div className="bg-background/40 backdrop-blur-xl border border-border/20 rounded-3xl shadow-2xl p-8">
            <Link 
              to="/login" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Link>

            <h1 className="text-3xl font-light mb-3 text-center text-foreground">
              Reset Password
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Enter your email address and we'll send you a link to reset your password
            </p>
            
            {emailSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-foreground">
                  Check your email for a password reset link
                </p>
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={() => setEmailSent(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    try again
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/50 backdrop-blur-sm border-border/30"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary/90 hover:bg-primary backdrop-blur-sm"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
