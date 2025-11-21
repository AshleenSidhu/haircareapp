/**
 * Regimen Types for Community Hub
 */

export interface Regimen {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  
  // Content
  title: string;
  description?: string;
  steps: RegimenStep[];
  tags: string[];
  hairType?: 'straight' | 'wavy' | 'curly' | 'coily' | 'mixed';
  porosity?: 'low' | 'medium' | 'high';
  
  // Privacy
  isPublic: boolean;
  isDraft?: boolean;
  
  // Engagement
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  viewsCount?: number;
  
  // Metadata
  createdAt: Date | any;
  updatedAt: Date | any;
  publishedAt?: Date | any;
  
  // Trending/Engagement score (calculated)
  engagementScore?: number;
}

export interface RegimenStep {
  id: string;
  order: number;
  title: string;
  description: string;
  products?: RegimenStepProduct[];
  duration?: string; // e.g., "5 minutes", "overnight"
  frequency?: string; // e.g., "daily", "weekly", "2x per week"
  tips?: string[];
}

export interface RegimenStepProduct {
  productId: string;
  productName: string;
  productBrand?: string;
  productImageUrl?: string;
  quantity?: string; // e.g., "2 pumps", "quarter-sized amount"
  notes?: string;
}

export interface Comment {
  id: string;
  regimenId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string; // Markdown supported
  mentions?: string[]; // Array of mentioned user IDs
  parentCommentId?: string; // For nested replies
  likesCount: number;
  createdAt: Date | any;
  updatedAt?: Date | any;
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface RegimenLike {
  regimenId: string;
  userId: string;
  createdAt: Date | any;
}

export interface RegimenSave {
  regimenId: string;
  userId: string;
  savedToRegimenId?: string; // If saved to user's personal regimen
  createdAt: Date | any;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: Date | any;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedType: 'regimen' | 'comment';
  reportedId: string; // regimenId or commentId
  reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date | any;
  reviewedAt?: Date | any;
  reviewedBy?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'comment' | 'like' | 'save' | 'follow' | 'mention';
  relatedRegimenId?: string;
  relatedCommentId?: string;
  relatedUserId?: string; // User who performed the action
  message: string;
  isRead: boolean;
  createdAt: Date | any;
}

export interface RegimenFilters {
  search?: string;
  tags?: string[];
  authorId?: string;
  hairType?: string;
  porosity?: string;
  sortBy?: 'new' | 'trending' | 'top';
}

