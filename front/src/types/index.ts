// Article types
export interface Article {
  id: string;
  title: string;
  description?: string;
  content: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source: string;
  author?: string;
  category: string;
  language: string;
  tags: string[];
  summary?: string;
}

// Filter types
export interface NewsFilter {
  category?: string;
  language?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
}

// Board types
export interface Board {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

// Bookmark types
export interface Bookmark {
  id: string;
  user_id: string;
  article_id: string;
  title: string;
  article_data: Article;
  created_at: string;
}

// Activity types
export interface Activity {
  id: string;
  user_id: string;
  type: 'read' | 'bookmark' | 'like' | 'share' | 'summarize';
  article_id: string;
  article_title: string;
  timestamp: string;
}

// User preference types
export interface UserPreferences {
  user_id: string;
  preferred_categories: string[];
  notifications_enabled: boolean;
  email_notifications: boolean;
}