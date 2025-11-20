import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Home, Lightbulb, Info, Mail, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface NavBarProps {
  activeSection: string;
  onNavClick: (sectionId: string) => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tips', label: 'Tips', icon: Lightbulb },
  { id: 'about', label: 'About', icon: Info },
  { id: 'contact', label: 'Contact', icon: Mail },
];

export const NavBar = ({ activeSection, onNavClick }: NavBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Trap focus in menu
      const focusableElements = menuRef.current?.querySelectorAll(
        'a, button, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements?.[0] as HTMLElement;
      const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      firstElement?.focus();

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [isMenuOpen]);

  // Close menu on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  const handleNavClick = (sectionId: string) => {
    onNavClick(sectionId);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    navigate('/');
  };

  // Show minimized nav when logged in OR on mobile
  const showMinimized = isLoggedIn || isMobile;

  return (
    <>
      {/* Skip to content link */}
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={(e) => {
          e.preventDefault();
          onNavClick('home');
        }}
      >
        Skip to content
      </a>

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
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('home');
              }}
              className="text-xl font-semibold text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent rounded-md px-2 py-1"
            >
              HairCare
            </a>

            {/* Full Navigation (when not logged in AND desktop) */}
            {!showMinimized && (
              <div className="hidden md:flex items-center gap-6 lg:gap-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(item.id);
                      }}
                      className={cn(
                        'text-sm text-foreground/70 hover:text-foreground transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent rounded-md px-2 py-1',
                        isActive && 'text-foreground font-semibold'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.label}
                      {isActive && (
                        <span
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left duration-300"
                          aria-hidden="true"
                        />
                      )}
                    </a>
                  );
                })}
                <a href="/login">
                  <Button size="sm" variant="outline" className="bg-background/10 hover:bg-background/20">
                    Login
                  </Button>
                </a>
              </div>
            )}

            {/* Minimized Navigation (when logged in OR mobile) */}
            {showMinimized && (
              <div className="flex items-center gap-3">
                {/* Quick access icons for logged-in users on desktop */}
                {isLoggedIn && !isMobile && (
                  <div className="hidden md:flex items-center gap-2">
                    <a
                      href="#home"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick('home');
                      }}
                      className="p-2 text-foreground/70 hover:text-foreground rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Home"
                    >
                      <Home className="w-5 h-5" />
                    </a>
                    <a
                      href="#tips"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick('tips');
                      }}
                      className="p-2 text-foreground/70 hover:text-foreground rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Tips"
                    >
                      <Lightbulb className="w-5 h-5" />
                    </a>
                  </div>
                )}

                {/* Menu Button */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-md text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent"
                  aria-label="Toggle menu"
                  aria-expanded={isMenuOpen}
                  aria-controls="nav-menu"
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                {/* User Avatar (when logged in) */}
                {isLoggedIn && (
                  <a
                    href="/profile"
                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-foreground hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent"
                    aria-label="Profile"
                  >
                    <User className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            id="nav-menu"
            className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-4 animate-in slide-in-from-top-2 duration-200"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.id);
                    }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                      isActive && 'text-foreground font-semibold bg-accent/10'
                    )}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </a>
                );
              })}

              {/* Additional links for logged-in users */}
              {isLoggedIn && (
                <>
                  <div className="h-px bg-border my-2" />
                  <a
                    href="/chat"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    role="menuitem"
                  >
                    <Mail className="w-5 h-5" />
                    Chat
                  </a>
                  <a
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    role="menuitem"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard
                  </a>
                  <a
                    href="/products"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    role="menuitem"
                  >
                    Products
                  </a>
                  <a
                    href="/community"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    role="menuitem"
                  >
                    Community
                  </a>
                </>
              )}

              {/* Auth buttons */}
              {!isLoggedIn && (
                <>
                  <div className="h-px bg-border my-2" />
                  <a
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    role="menuitem"
                  >
                    Login
                  </a>
                </>
              )}

              {isLoggedIn && (
                <>
                  <div className="h-px bg-border my-2" />
                  <button
                    onClick={handleLogout}
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
    </>
  );
};

