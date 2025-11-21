import { useState, useEffect, useRef } from "react";
import { NavLink } from "../components/NavLink";
import { Button } from "../components/ui/button";
import { Menu, X, LogOut, LayoutDashboard, User, Home, Lightbulb, Info, Mail } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const baseNavigationItems = [
  { name: "Home", path: "/", icon: Home },
  { name: "Tips", path: "/tips", icon: Lightbulb },
  { name: "About", path: "/about", icon: Info },
  { name: "Contact", path: "/contact", icon: Mail },
];

const authenticatedNavigationItems = [
  { name: "Chat", path: "/chat", icon: Mail },
  { name: "Products", path: "/products", icon: undefined },
  { name: "Community", path: "/community", icon: undefined },
];

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const isLoggedIn = !!currentUser;

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Combine navigation items - only show authenticated items when logged in
  const navigationItems = currentUser 
    ? [...baseNavigationItems, ...authenticatedNavigationItems]
    : baseNavigationItems;

  // Show minimized nav when logged in OR on mobile
  const showMinimized = isLoggedIn || isMobile;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl transition-all duration-300',
        isScrolled && 'shadow-lg'
      )}
    >
      <div
        className={cn(
          'bg-white/10 backdrop-blur-md border border-white/20 rounded-full transition-all duration-300',
          isScrolled && 'bg-white/20 shadow-xl'
        )}
      >
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 md:px-8">
          {/* Logo */}
          <NavLink to="/" className="text-xl font-semibold text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent rounded-md px-2 py-1">
            HairCare
          </NavLink>

          {/* Full Navigation (when not logged in AND desktop) */}
          {!showMinimized && (
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {baseNavigationItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent rounded-md px-2 py-1"
                  activeClassName="text-foreground font-semibold"
                >
                  {item.name}
                </NavLink>
              ))}
              <NavLink to="/scan">
                <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-medium">
                  Start Analysis
                </Button>
              </NavLink>
              <NavLink to="/login">
                <Button size="sm" variant="outline" className="bg-background/10 hover:bg-background/20">
                  Login
                </Button>
              </NavLink>
            </div>
          )}

          {/* Minimized Navigation (when logged in OR mobile) */}
          {showMinimized && (
            <div className="flex items-center gap-3">
              {/* Quick access icons for logged-in users on desktop */}
              {isLoggedIn && !isMobile && (
                <div className="hidden md:flex items-center gap-2">
                  <NavLink
                    to="/"
                    className="p-2 text-foreground/70 hover:text-foreground rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Home"
                  >
                    <Home className="w-5 h-5" />
                  </NavLink>
                  <NavLink
                    to="/tips"
                    className="p-2 text-foreground/70 hover:text-foreground rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Tips"
                  >
                    <Lightbulb className="w-5 h-5" />
                  </NavLink>
                </div>
              )}

              {/* Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-md text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent"
                aria-label="Toggle menu"
                aria-expanded={isOpen}
                aria-controls="nav-menu"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              {/* User Avatar (when logged in) */}
              {isLoggedIn && (
                <NavLink
                  to="/profile"
                  className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-foreground hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent"
                  aria-label="Profile"
                >
                  <User className="w-5 h-5" />
                </NavLink>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          id="nav-menu"
          className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-4 animate-in slide-in-from-top-2 duration-200"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="flex flex-col gap-2">
            {baseNavigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  activeClassName="text-foreground font-semibold bg-accent/10"
                  role="menuitem"
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              );
            })}

            {/* Additional links for logged-in users */}
            {isLoggedIn && (
              <>
                <div className="h-px bg-border my-2" />
                {authenticatedNavigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      activeClassName="text-foreground font-semibold bg-accent/10"
                      role="menuitem"
                    >
                      {Icon && <Icon className="w-5 h-5" />}
                      {item.name}
                    </NavLink>
                  );
                })}
                <NavLink
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  activeClassName="text-foreground font-semibold bg-accent/10"
                  role="menuitem"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  activeClassName="text-foreground font-semibold bg-accent/10"
                  role="menuitem"
                >
                  <User className="w-5 h-5" />
                  Profile
                </NavLink>
              </>
            )}

            {/* Auth buttons */}
            {!isLoggedIn && (
              <>
                <div className="h-px bg-border my-2" />
                <NavLink
                  to="/scan"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  role="menuitem"
                >
                  Start Analysis
                </NavLink>
                <NavLink
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  role="menuitem"
                >
                  Login
                </NavLink>
              </>
            )}

            {isLoggedIn && (
              <>
                <div className="h-px bg-border my-2" />
                <NavLink
                  to="/scan"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  role="menuitem"
                >
                  Start Analysis
                </NavLink>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary w-full text-left"
                  role="menuitem"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
