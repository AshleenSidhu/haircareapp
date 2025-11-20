/**
 * Community Hub - Regimens Feature
 * Auth-gated page for viewing, commenting, saving, and following regimens
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  Star,
  Users,
  LogIn,
  UserPlus,
  Sparkles,
  Plus
} from 'lucide-react';
import { RegimenCard } from '../components/RegimenCard';
import { RegimenFilters } from '../lib/types/regimens';
import { fetchRegimens } from '../lib/utils/regimens';
import { Regimen } from '../lib/types/regimens';

const Community = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [regimens, setRegimens] = useState<Regimen[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RegimenFilters>({
    sortBy: 'new'
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadRegimens();
    } else {
      setLoading(false);
    }
  }, [currentUser, filters]);

  const loadRegimens = async () => {
    try {
      setLoading(true);
      const fetchedRegimens = await fetchRegimens({
        ...filters,
        search: searchQuery || undefined,
      });
      setRegimens(fetchedRegimens);
    } catch (error) {
      console.error('Error loading regimens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setFilters(prev => ({ ...prev, search: value || undefined }));
  };

  const handleSortChange = (sortBy: 'new' | 'trending' | 'top') => {
    setFilters(prev => ({ ...prev, sortBy }));
  };

  // Auth-gated: Show CTA for unauthenticated users
  if (!currentUser) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Card className="max-w-2xl w-full p-12 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-foreground">
                  Join the Community Hub
                </h1>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  Discover hair care regimens from the community, share your own routines, 
                  and connect with others who have similar hair types and concerns.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Discover Regimens</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse curated hair care routines from the community
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Save & Organize</h3>
                  <p className="text-sm text-muted-foreground">
                    Save your favorite regimens to your personal collection
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Connect & Share</h3>
                  <p className="text-sm text-muted-foreground">
                    Follow creators and share your own hair care journey
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto"
                  onClick={() => navigate('/login')}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => navigate('/signup')}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Sign Up
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  // Authenticated view: Show community feed
  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Community Hub</h1>
              <p className="text-muted-foreground">
                Discover and share hair care regimens from the community
              </p>
            </div>
            <Button onClick={() => navigate('/community/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Share Regimen
            </Button>
          </div>

          {/* Search and Filters */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search regimens, tags, authors..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort Options */}
              <div className="flex gap-2">
                <Button
                  variant={filters.sortBy === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSortChange('new')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  New
                </Button>
                <Button
                  variant={filters.sortBy === 'trending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSortChange('trending')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Trending
                </Button>
                <Button
                  variant={filters.sortBy === 'top' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSortChange('top')}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Top
                </Button>
              </div>
            </div>
          </Card>

          {/* Regimens Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading regimens...</p>
            </div>
          ) : regimens.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No regimens found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery 
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to share a regimen with the community!'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/community/create')}>
                  Create Your First Regimen
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regimens.map((regimen) => (
                <RegimenCard 
                  key={regimen.id} 
                  regimen={regimen}
                  onView={() => navigate(`/community/regimen/${regimen.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Community;
