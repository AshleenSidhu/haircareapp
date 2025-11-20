import { useState } from "react";
import { NavLink } from "../components/NavLink";
import { Button } from "../components/ui/button";
import { Menu, X, LogOut, LayoutDashboard, User } from "lucide-react";
//import { cn } from "@/lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const baseNavigationItems = [
  { name: "Home", path: "/" },
  { name: "Tips", path: "/tips" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
];

const authenticatedNavigationItems = [
  { name: "Chat", path: "/chat" },
  { name: "Products", path: "/products" },
  { name: "Community", path: "/community" },
];

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Combine navigation items - only show Products when logged in
  const navigationItems = currentUser 
    ? [...baseNavigationItems, ...authenticatedNavigationItems]
    : baseNavigationItems;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg">
        <div className="flex justify-between items-center h-16 px-6 sm:px-8">
          {/* Logo */}
          <NavLink to="/" className="text-xl font-semibold text-foreground">
            HairCare
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                activeClassName="text-foreground font-medium"
              >
                {item.name}
              </NavLink>
            ))}
            {currentUser && (
              <>
                <NavLink
                  to="/dashboard"
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
                  activeClassName="text-foreground font-medium"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
                  activeClassName="text-foreground font-medium"
                >
                  <User className="w-4 h-4" />
                  Profile
                </NavLink>
              </>
            )}
            <NavLink to="/scan">
              <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-medium">
                Start Analysis
              </Button>
            </NavLink>
            {currentUser ? (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleLogout}
                className="text-foreground/70 hover:text-foreground hover:bg-accent/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            ) : (
              <NavLink to="/login">
                <Button size="sm" variant="outline" className="bg-background/10 hover:bg-background/20">
                  Login
                </Button>
              </NavLink>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-foreground hover:bg-accent/10"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden mt-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-lg">
          <div className="flex flex-col gap-3 p-6">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors py-2"
                activeClassName="text-foreground font-medium"
              >
                {item.name}
              </NavLink>
            ))}
            {currentUser && (
              <>
                <NavLink
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors py-2 flex items-center gap-2"
                  activeClassName="text-foreground font-medium"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors py-2 flex items-center gap-2"
                  activeClassName="text-foreground font-medium"
                >
                  <User className="w-4 h-4" />
                  Profile
                </NavLink>
              </>
            )}
            <NavLink to="/scan" onClick={() => setIsOpen(false)}>
              <Button size="sm" className="w-full bg-white text-primary hover:bg-white/90 font-medium">
                Start Analysis
              </Button>
            </NavLink>
            {currentUser ? (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full justify-start text-foreground/70 hover:text-foreground hover:bg-accent/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            ) : (
              <NavLink to="/login" onClick={() => setIsOpen(false)}>
                <Button size="sm" variant="outline" className="w-full bg-background/10 hover:bg-background/20">
                  Login
                </Button>
              </NavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
