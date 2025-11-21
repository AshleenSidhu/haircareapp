/**
 * Comments Section Component
 * Displays comments and comment composer for a regimen
 */

import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Heart, Send, Flag } from 'lucide-react';
import { Comment } from '../lib/types/regimens';
import { fetchComments, addComment, reportContent } from '../lib/utils/regimens';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { CommentComposer } from './CommentComposer';

interface CommentsSectionProps {
  regimenId: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ regimenId }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    loadComments();
  }, [regimenId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const fetchedComments = await fetchComments(regimenId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!currentUser) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to comment.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addComment(
        regimenId,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'Anonymous',
        content
      );
      await loadComments();
      setShowComposer(false);
      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment.",
        variant: "destructive",
      });
    }
  };

  const handleReport = async (commentId: string) => {
    if (!currentUser) return;

    try {
      await reportContent(
        currentUser.uid,
        'comment',
        commentId,
        'inappropriate'
      );
      toast({
        title: "Report submitted",
        description: "Thank you for reporting. Our team will review it.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report.",
        variant: "destructive",
      });
    }
  };

  const getAuthorInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date | any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <Card className="p-6 sticky top-24">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-xl font-semibold mb-2">Comments</h3>
          <p className="text-sm text-muted-foreground">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </p>
        </div>

        {/* Comment Composer */}
        {currentUser ? (
          showComposer ? (
            <CommentComposer
              onSubmit={handleAddComment}
              onCancel={() => setShowComposer(false)}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowComposer(true)}
            >
              Add a comment...
            </Button>
          )
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Log in to join the conversation
            </p>
            <Button size="sm" variant="outline">
              Log In
            </Button>
          </div>
        )}

        <Separator />

        {/* Comments List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    {comment.authorAvatar && (
                      <AvatarImage src={comment.authorAvatar} alt={comment.authorName} />
                    )}
                    <AvatarFallback className="text-xs">
                      {getAuthorInitials(comment.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {comment.authorName}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.isEdited && (
                        <span className="text-xs text-muted-foreground">(edited)</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {comment.likesCount}
                      </button>
                      {currentUser && (
                        <button
                          onClick={() => handleReport(comment.id)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Flag className="w-3 h-3" />
                          Report
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {comment.id !== comments[comments.length - 1].id && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

