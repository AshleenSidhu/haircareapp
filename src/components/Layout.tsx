import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navigation } from "components/Navigation";
import { Button } from "components/ui/button";
import { ArrowLeft } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
}

export const Layout = ({ children, showBackButton = false }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {showBackButton && !isHomePage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      )}
      
      <main>{children}</main>
    </div>
  );
};
