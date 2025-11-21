/**
 * Detailed Regimen View Page
 * Shows full regimen details with comments sidebar
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { 
  ArrowLeft, 
  Heart, 
  Bookmark, 
  Share2, 
  Flag,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { Regimen, Comment } from '../lib/types/regimens';
import { 
  fetchRegimenById, 
  likeRegimen, 
  isRegimenLiked,
  saveRegimen,
  isRegimenSaved,
  followUser,
  isFollowing,
  reportContent
} from '../lib/utils/regimens';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { CommentsSection } from '../components/CommentsSection';
import { SaveRegimenModal } from '../components/SaveRegimenModal';

export const RegimenView = () => {
  const { regimenId } = useParams<{ regimenId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [regimen, setRegimen] = useState<Regimen | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (regimenId) {
      loadRegimen();
    }
  }, [regimenId, currentUser]);

  const loadRegimen = async () => {
    if (!regimenId) return;
    
    try {
      setLoading(true);
      const fetchedRegimen = await fetchRegimenById(regimenId);
      if (!fetchedRegimen) {
        toast({
          title: "Regimen not found",
          description: "This regimen may have been deleted or is private.",
          variant: "destructive",
        });
        navigate('/community');
        return;
      }
      
      setRegimen(fetchedRegimen);
      setLikesCount(fetchedRegimen.likesCount);
      setSavesCount(fetchedRegimen.savesCount);

      if (currentUser) {
        const [liked, saved, following] = await Promise.all([
          isRegimenLiked(regimenId, currentUser.uid),
          isRegimenSaved(regimenId, currentUser.uid),
          fetchedRegimen.authorId !== currentUser.uid 
            ? isFollowing(currentUser.uid, fetchedRegimen.authorId)
            : Promise.resolve(false),
        ]);
        setIsLiked(liked);
        setIsSaved(saved);
        setIsFollowingAuthor(following);
      }
    } catch (error) {
      console.error('Error loading regimen:', error);
      toast({
        title: "Error",
        description: "Failed to load regimen. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser || !regimenId) return;
    
    try {
      await likeRegimen(regimenId, currentUser.uid);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to like regimen.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!currentUser || !regimenId) return;
    
    // Open save modal to choose where to save
    setShowSaveModal(true);
  };

  const handleFollow = async () => {
    if (!currentUser || !regimen) return;
    
    try {
      await followUser(currentUser.uid, regimen.authorId);
      setIsFollowingAuthor(!isFollowingAuthor);
      toast({
        title: isFollowingAuthor ? "Unfollowed" : "Following",
        description: isFollowingAuthor 
          ? `You unfollowed ${regimen.authorName}`
          : `You're now following ${regimen.authorName}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to follow user.",
        variant: "destructive",
      });
    }
  };

  const handleReport = async (reason: string, description?: string) => {
    if (!currentUser || !regimenId) return;
    
    try {
      await reportContent(
        currentUser.uid,
        'regimen',
        regimenId,
        reason as any,
        description
      );
      toast({
        title: "Report submitted",
        description: "Thank you for reporting. Our team will review it.",
      });
      setShowReportModal(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background pt-24 pb-12 px-4">
          <div className="max-w-6xl mx-auto">
            <p className="text-center text-muted-foreground">Loading regimen...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!regimen) {
    return null;
  }

  const authorInitials = regimen.authorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/community')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Community
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-12 h-12">
                      {regimen.authorAvatar && (
                        <AvatarImage src={regimen.authorAvatar} alt={regimen.authorName} />
                      )}
                      <AvatarFallback>{authorInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{regimen.authorName}</p>
                      {regimen.hairType && (
                        <p className="text-sm text-muted-foreground capitalize">
                          {regimen.hairType} hair
                          {regimen.porosity && ` • ${regimen.porosity} porosity`}
                        </p>
                      )}
                    </div>
                  </div>
                  {currentUser && regimen.authorId !== currentUser.uid && (
                    <Button
                      variant={isFollowingAuthor ? "outline" : "default"}
                      size="sm"
                      onClick={handleFollow}
                    >
                      {isFollowingAuthor ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <h1 className="text-3xl font-bold text-foreground mb-4">
                  {regimen.title}
                </h1>

                {regimen.description && (
                  <p className="text-muted-foreground mb-4">
                    {regimen.description}
                  </p>
                )}

                {/* Tags */}
                {regimen.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {regimen.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={handleLike}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                    {likesCount}
                  </Button>
                  <Button
                    variant={isSaved ? "default" : "outline"}
                    size="sm"
                    onClick={handleSave}
                  >
                    <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                    Save ({savesCount})
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  {currentUser && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReportModal(true)}
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Report
                    </Button>
                  )}
                </div>
              </Card>

              {/* Steps */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Regimen Steps</h2>
                <div className="space-y-6">
                  {regimen.steps.map((step) => (
                    <div key={step.id} className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {step.order}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {step.title}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {step.description}
                          </p>

                          {/* Products */}
                          {step.products && step.products.length > 0 && (
                            <div className="space-y-2 mb-3">
                              <p className="text-sm font-medium text-foreground">Products:</p>
                              {step.products.map((product, idx) => (
                                <div key={idx} className="text-sm bg-muted/50 p-3 rounded-lg">
                                  <p className="font-medium">
                                    {product.productBrand && `${product.productBrand} - `}
                                    {product.productName}
                                  </p>
                                  {product.quantity && (
                                    <p className="text-muted-foreground text-xs mt-1">
                                      Quantity: {product.quantity}
                                    </p>
                                  )}
                                  {product.notes && (
                                    <p className="text-muted-foreground text-xs mt-1">
                                      {product.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Duration & Frequency */}
                          {(step.duration || step.frequency) && (
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              {step.duration && (
                                <span>Duration: {step.duration}</span>
                              )}
                              {step.frequency && (
                                <span>Frequency: {step.frequency}</span>
                              )}
                            </div>
                          )}

                          {/* Tips */}
                          {step.tips && step.tips.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-foreground mb-2">Tips:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {step.tips.map((tip, idx) => (
                                  <li key={idx}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      {step.id !== regimen.steps[regimen.steps.length - 1].id && (
                        <Separator className="my-6" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Comments Sidebar */}
            <div className="lg:col-span-1">
              <CommentsSection regimenId={regimen.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && regimenId && (
        <SaveRegimenModal
          regimenId={regimenId}
          open={showSaveModal}
          onOpenChange={setShowSaveModal}
          onSave={() => {
            setIsSaved(true);
            setSavesCount(prev => prev + 1);
            setShowSaveModal(false);
          }}
        />
      )}

      {/* Report Modal - Simple implementation */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full m-4">
            <h3 className="text-xl font-semibold mb-4">Report Regimen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Why are you reporting this regimen?
            </p>
            <div className="space-y-2 mb-4">
              {['spam', 'inappropriate', 'harassment', 'misinformation', 'other'].map((reason) => (
                <Button
                  key={reason}
                  variant="outline"
                  className="w-full justify-start capitalize"
                  onClick={() => handleReport(reason)}
                >
                  {reason}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowReportModal(false)}
            >
              Cancel
            </Button>
          </Card>
        </div>
      )}
    </Layout>
  );
};

