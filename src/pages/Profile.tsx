/**
 * User Profile Page
 */

import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Layout } from "../components/Layout";
import { User, Mail, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return "U";
    return email
      .split("@")[0]
      .split(".")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto fade-in">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl mb-2 text-foreground">Profile</h1>
          <p className="text-muted-foreground text-lg">Manage your account settings</p>
        </div>

        <Card className="p-8 bg-card border-border shadow-sm mb-6">
          <div className="flex items-center gap-6 mb-8">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(currentUser?.email || "")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl mb-1 text-foreground">
                {currentUser?.displayName || "User"}
              </h2>
              <p className="text-muted-foreground">{currentUser?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">{currentUser?.email || "Not set"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">User ID</p>
                <p className="text-sm text-muted-foreground font-mono text-xs">
                  {currentUser?.uid || "Not available"}
                </p>
              </div>
            </div>

            {currentUser?.emailVerified !== undefined && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email Verified</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUser.emailVerified ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-8 bg-card border-border shadow-sm mb-6">
          <h3 className="text-xl mb-4 text-foreground">Account Actions</h3>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/dashboard")}
            >
              <User className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/quiz")}
            >
              Take Quiz Again
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/results")}
            >
              View Results
            </Button>
          </div>
        </Card>

        <Card className="p-8 bg-card border-border shadow-sm">
          <h3 className="text-xl mb-4 text-foreground text-destructive">Danger Zone</h3>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;

