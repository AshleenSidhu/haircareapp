/**
 * Regimen Card Component
 * Displays a preview of a regimen in the community feed
 */

import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Heart, 
  Bookmark, 
  MessageCircle, 
  Eye,
  User
} from 'lucide-react';
import { Regimen } from '../lib/types/regimens';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  likeRegimen, 
  isRegimenLiked, 
  saveRegimen, 
  isRegimenSaved 
} from '../lib/utils/regimens';
import { useToast } from '../hooks/use-toast';

interface RegimenCardProps {
  regimen: Regimen;
  onView: () => void;
}

export const RegimenCard: React.FC<RegimenCardProps> = ({ regimen, onView }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(regimen.likesCount);
  const [savesCount, setSavesCount] = useState(regimen.savesCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      checkLikeStatus();
      checkSaveStatus();
    }
  }, [currentUser, regimen.id]);

  const checkLikeStatus = async () => {
    if (!currentUser) return;
    try {
      const liked = await isRegimenLiked(regimen.id, currentUser.uid);
      setIsLiked(liked);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const checkSaveStatus = async () => {
    if (!currentUser) return;
    try {
      const saved = await isRegimenSaved(regimen.id, currentUser.uid);
      setIsSaved(saved);
    } catch (error) {
      console.error('Error checking save status:', error);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like regimens.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await likeRegimen(regimen.id, currentUser.uid);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to like regimen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to save regimens.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await saveRegimen(regimen.id, currentUser.uid);
      setIsSaved(!isSaved);
      setSavesCount(prev => isSaved ? prev - 1 : prev + 1);
      toast({
        title: isSaved ? "Regimen unsaved" : "Regimen saved",
        description: isSaved 
          ? "Removed from your saved regimens." 
          : "Added to your saved regimens.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save regimen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get first 2 steps for preview
  const previewSteps = regimen.steps.slice(0, 2);
  const remainingSteps = regimen.steps.length - 2;

  // Get author initials
  const authorInitials = regimen.authorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card 
      className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onView}
    >
      {/* Author Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="w-10 h-10">
          {regimen.authorAvatar && (
            <AvatarImage src={regimen.authorAvatar} alt={regimen.authorName} />
          )}
          <AvatarFallback>{authorInitials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {regimen.authorName}
          </p>
          {regimen.hairType && (
            <p className="text-xs text-muted-foreground capitalize">
              {regimen.hairType} hair
            </p>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-2">
        {regimen.title}
      </h3>

      {/* Description */}
      {regimen.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {regimen.description}
        </p>
      )}

      {/* Preview Steps */}
      <div className="space-y-2 mb-4">
        {previewSteps.map((step) => (
          <div key={step.id} className="text-sm">
            <span className="font-medium text-foreground">
              {step.order}. {step.title}
            </span>
            {step.description && (
              <p className="text-muted-foreground text-xs mt-1 line-clamp-1">
                {step.description}
              </p>
            )}
          </div>
        ))}
        {remainingSteps > 0 && (
          <p className="text-xs text-muted-foreground">
            +{remainingSteps} more step{remainingSteps !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Tags */}
      {regimen.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {regimen.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {regimen.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{regimen.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Engagement Stats */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button
            onClick={handleLike}
            disabled={loading}
            className={`flex items-center gap-1 hover:text-foreground transition-colors ${
              isLiked ? 'text-red-500' : ''
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex items-center gap-1 hover:text-foreground transition-colors ${
              isSaved ? 'text-primary' : ''
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            <span>{savesCount}</span>
          </button>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{regimen.commentsCount}</span>
          </div>
          {regimen.viewsCount !== undefined && (
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{regimen.viewsCount}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

