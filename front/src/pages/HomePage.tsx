import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Loader, RefreshCw, Menu, X, Plus, Settings, Bookmark as BookmarkIcon, Activity as ActivityIcon } from 'lucide-react';
import { ArticleCard } from '../components/News/ArticleCard';
import { CategoryFilter } from '../components/News/CategoryFilter';
import { Article } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { notificationService } from '../lib/notificationService';
import { NotificationDropdown } from '../components/NotificationDropdown';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm] = useState('');
  const [searchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Set<string>>(new Set());
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());
  const [summarizedArticles, setSummarizedArticles] = useState<Map<string, string>>(new Map());
  const [summarizingIds, setSummarizingIds] = useState<Set<string>>(new Set());
  const [showBoardModal, setShowBoardModal] = useState<string | null>(null);
  const [userBoards, setUserBoards] = useState<any[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [followedCategories, setFollowedCategories] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSearchMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserData();
      loadUserPreferences();
    } else {
      setBookmarkedArticles(new Set());
      setLikedArticles(new Set());
    }
  }, [user]);

  useEffect(() => {
    if (!isSearchMode) {
      fetchNews(selectedCategory);
    }
    
    if (user && followedCategories.includes(selectedCategory) && notificationsEnabled) {
      checkForNewArticles(selectedCategory);
    }
  }, [selectedCategory, followedCategories, notificationsEnabled, isSearchMode]);

  useEffect(() => {
    if (!isSearchMode) {
      fetchNews(selectedCategory);
    }
  }, []);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      const bookmarksRef = collection(db, 'bookmarks');
      const bookmarksQuery = query(bookmarksRef, where('user_id', '==', user.uid));
      const bookmarksSnapshot = await getDocs(bookmarksQuery);
      
      const bookmarkedIds = new Set<string>();
      bookmarksSnapshot.forEach((doc) => {
        bookmarkedIds.add(doc.data().article_id);
      });
      setBookmarkedArticles(bookmarkedIds);

      const likesRef = collection(db, 'likes');
      const likesQuery = query(likesRef, where('user_id', '==', user.uid));
      const likesSnapshot = await getDocs(likesQuery);
      
      const likedIds = new Set<string>();
      likesSnapshot.forEach((doc) => {
        likedIds.add(doc.data().article_id);
      });
      setLikedArticles(likedIds);

      const boardsRef = collection(db, 'boards');
      const boardsQuery = query(boardsRef, where('user_id', '==', user.uid));
      const boardsSnapshot = await getDocs(boardsQuery);
      
      const boards: any[] = [];
      boardsSnapshot.forEach((doc) => {
        boards.push({ id: doc.id, ...doc.data() });
      });
      setUserBoards(boards);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const prefDoc = await getDoc(doc(db, 'preferences', user.uid));
      if (prefDoc.exists()) {
        const prefs = prefDoc.data();
        setFollowedCategories(prefs.preferredCategories || []);
        setNotificationsEnabled(prefs.pushNotifications || false);
        setSelectedLanguage(prefs.language || 'en');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const checkForNewArticles = async (category: string) => {
    if (!('Notification' in window)) return;

    let hasPermission = Notification.permission === 'granted';

    if (!hasPermission && notificationsEnabled) {
      const permission = await Notification.requestPermission();
      hasPermission = permission === 'granted';
      if (!hasPermission) return;
    }

    if (articles.length > 0 && hasPermission) {
      await notificationService.notifyNewArticle(
        user?.uid ?? '',
        articles[0].title,
        category,
        articles[0].url
      );
    }
  };

  const fetchNews = async (category: string) => {
    setLoading(true);
    setArticles([]);

    try {
      const timestamp = Date.now();
      const response = await fetch(`${API_URL}/api/news?category=${category}&t=${timestamp}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        const transformedArticles: Article[] = data.articles.map((article: any) => {
          const stableId = article.url ? btoa(article.url).substring(0, 50) : `temp-${Date.now()}`;
          
          return {
            id: stableId,
            title: article.title || 'No title',
            description: article.description || '',
            content: article.content || article.description || article.title || '',
            url: article.url,
            urlToImage: article.urlToImage,
            publishedAt: article.publishedAt,
            source: article.source || 'Unknown',
            author: article.author || 'Unknown',
            category: category,
            language: 'en',
            tags: [category, article.source].filter(Boolean)
          };
        });
        
        console.log('📰 Fetched articles:', transformedArticles.length);
        console.log('🕐 Latest article date:', transformedArticles[0]?.publishedAt);

        setArticles(transformedArticles);
      } else {
        console.error('API returned error:', data);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      alert('Failed to load news. Please check if backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };
  
  const saveActivity = async (type: string, articleId: string, articleTitle: string) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'activities'), {
        user_id: user.uid,
        type: type,
        article_id: articleId,
        article_title: articleTitle,
        timestamp: Timestamp.now()
      });
      console.log('✅ Activity saved:', type);
    } catch (error) {
      console.error('❌ Error saving activity:', error);
    }
  };

  const handleSummarize = async (articleId: string) => {
    if (summarizedArticles.has(articleId)) {
      const newMap = new Map(summarizedArticles);
      newMap.delete(articleId);
      setSummarizedArticles(newMap);
      return;
    }

    setSummarizingIds(prev => new Set(prev).add(articleId));

    try {
      const article = articles.find(a => a.id === articleId);
      if (!article) {
        console.error('Article not found:', articleId);
        return;
      }

      const textToSummarize = article.content || article.description || article.title;
      
      console.log('Summarizing:', textToSummarize.substring(0, 100) + '...');

      const response = await fetch(`${API_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textToSummarize,
          lang: selectedLanguage
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Summary received:', data);
      
      if (data.summary) {
        const newMap = new Map(summarizedArticles);
        newMap.set(articleId, data.summary);
        setSummarizedArticles(newMap);

        if (user) {
          await saveActivity('summarize', articleId, article.title);
        }
      } else {
        alert('Failed to generate summary. Please try again.');
      }
    } catch (error) {
      console.error('Error summarizing:', error);
      alert('Failed to generate summary. Make sure backend is running.');
    } finally {
      setSummarizingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
  };

  const handleBookmark = async (articleId: string) => {
    if (!user) {
      alert('Please sign in to bookmark articles');
      return;
    }

    console.log('Bookmark clicked for:', articleId);

    try {
      if (bookmarkedArticles.has(articleId)) {
        console.log('Removing bookmark...');
        const bookmarksRef = collection(db, 'bookmarks');
        const q = query(bookmarksRef, where('user_id', '==', user.uid), where('article_id', '==', articleId));
        const snapshot = await getDocs(q);
        
        for (const document of snapshot.docs) {
          await deleteDoc(doc(db, 'bookmarks', document.id));
          console.log('Bookmark removed:', document.id);
        }

        setBookmarkedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(articleId);
          return newSet;
        });
      } else {
        console.log('Opening board modal...');
        setShowBoardModal(articleId);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      alert('Failed to bookmark. Error: ' + (error as Error).message);
    }
  };

  const handleAddToBoard = async (articleId: string, boardId: string) => {
    if (!user) return;

    console.log('Adding to board:', { articleId, boardId });

    try {
      const article = articles.find(a => a.id === articleId);
      if (!article) {
        console.error('Article not found:', articleId);
        alert('Article not found');
        return;
      }

      console.log('Article found:', article.title);

      const bookmarkData = {
        user_id: user.uid,
        article_id: articleId,
        board_id: boardId,
        article_data: article,
        created_at: Timestamp.now().toDate().toISOString()
      };

      console.log('Creating bookmark:', bookmarkData);

      const docRef = await addDoc(collection(db, 'bookmarks'), bookmarkData);
      console.log('Bookmark created:', docRef.id);

      setBookmarkedArticles(prev => new Set(prev).add(articleId));
      setShowBoardModal(null);

      try {
        await addDoc(collection(db, 'activities'), {
          user_id: user.uid,
          type: 'bookmark',
          article_id: articleId,
          article_title: article.title,
          timestamp: Timestamp.now()
        });
        console.log('Activity saved');
      } catch (activityError) {
        console.error('Failed to save activity:', activityError);
      }

      alert('Article saved to board!');
    } catch (error) {
      console.error('Error adding to board:', error);
      alert('Failed to save to board. Error: ' + (error as Error).message);
    }
  };

  const handleLike = async (articleId: string) => {
    if (!user) {
      alert('Please sign in to like articles');
      return;
    }

    console.log('Like clicked for:', articleId);

    try {
      if (likedArticles.has(articleId)) {
        console.log('Removing like...');
        const likesRef = collection(db, 'likes');
        const q = query(likesRef, where('user_id', '==', user.uid), where('article_id', '==', articleId));
        const snapshot = await getDocs(q);
        
        for (const document of snapshot.docs) {
          await deleteDoc(doc(db, 'likes', document.id));
          console.log('Like removed:', document.id);
        }

        setLikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(articleId);
          return newSet;
        });
      } else {
        console.log('Adding like...');
        const article = articles.find(a => a.id === articleId);
        
        const likeData = {
          user_id: user.uid,
          article_id: articleId,
          article_title: article?.title || 'Unknown',
          created_at: Timestamp.now()
        };

        console.log('Creating like:', likeData);

        const docRef = await addDoc(collection(db, 'likes'), likeData);
        console.log('Like created:', docRef.id);

        setLikedArticles(prev => new Set(prev).add(articleId));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to like article. Error: ' + (error as Error).message);
    }
  };

  const filteredArticles = useMemo(() => {
    if (isSearchMode) {
      return articles;
    }
    
    if (!searchTerm) return articles;
    
    return articles.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [articles, searchTerm, isSearchMode]);

  const refreshNews = () => {
    fetchNews(selectedCategory);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Loading your personalized news feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-400 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-600 to-gray-900 bg-clip-text text-transparent">
                🌧️ DailyDrizzle
              </h1>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-gray-700 hover:text-white font-medium transition-colors">Home</Link>
              <Link to="/bookmarks" className="text-gray-700 hover:text-white font-medium transition-colors">Bookmarks</Link>
              <Link to="/boards" className="text-gray-700 hover:text-white font-medium transition-colors">Boards</Link>
              <Link to="/activities" className="text-gray-700 hover:text-white font-medium transition-colors">Activity</Link>
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <NotificationDropdown />  

                  <div className="relative group">
                    <div className="w-8 h-8 bg-gradient-to-r from-gray-700 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold cursor-pointer">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/settings"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        to="/bookmarks"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <BookmarkIcon className="h-4 w-4" />
                        <span>Bookmarks</span>
                      </Link>
                      <Link
                        to="/activities"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <ActivityIcon className="h-4 w-4" />
                        <span>Activity</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t mt-1"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="px-4 py-2 bg-gradient-to-r from-blue-900 to-gray-700 text-white rounded-lg hover:from-gray-500 hover:to-blue-700 transition-colors font-medium"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {showMobileMenu && (
            <nav className="md:hidden mt-4 pt-4 border-t space-y-2">
              <Link to="/" className="block py-2 text-gray-700 hover:text-blue-600 font-medium">Home</Link>
              <Link to="/bookmarks" className="block py-2 text-gray-700 hover:text-blue-600 font-medium">Bookmarks</Link>
              <Link to="/boards" className="block py-2 text-gray-700 hover:text-blue-600 font-medium">Boards</Link>
              <Link to="/activities" className="block py-2 text-gray-700 hover:text-blue-600 font-medium">Activity</Link>
            </nav>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {user ? `Welcome back, ${user.email?.split('@')[0]}!` : 'Latest News'}
              </h2>
              <p className="text-gray-600 flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Stay updated with AI-powered news summaries</span>
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={refreshNews}
              className="flex items-center space-x-2 bg-gradient-to-r from-gray-900 to-sky-900 text-white px-4 py-2 rounded-lg hover:from-gray-300 hover:to-gray-200 font-medium shadow-md"
            >
              <RefreshCw className="h-4 w-4" />
              <span></span>
            </motion.button>
          </div>
          {/* Search Results Info */}
          {isSearchMode && searchQuery && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Showing results for: <strong>"{searchQuery}"</strong> ({filteredArticles.length} articles found)
              </p>
            </div>
          )}

          {/* Category Filter - Only show when not in search mode */}
          {!isSearchMode && (
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          )}
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="text-center py-12">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading articles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isBookmarked={bookmarkedArticles.has(article.id)}
                  isLiked={likedArticles.has(article.id)}
                  onBookmark={handleBookmark}
                  onLike={handleLike}
                  onSummarize={handleSummarize}
                  showSummary={summarizedArticles.has(article.id)}
                  summary={summarizedArticles.get(article.id)}
                  isSummarizing={summarizingIds.has(article.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredArticles.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or select a different category.
            </p>
          </motion.div>
        )}
      </div>

      {/* Board Selection Modal */}
      <AnimatePresence>
        {showBoardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBoardModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Save to Board</h3>
                <button 
                  onClick={() => setShowBoardModal(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {userBoards.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {userBoards.map(board => (
                    <button
                      key={board.id}
                      onClick={() => handleAddToBoard(showBoardModal, board.id)}
                      className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: board.color }}
                        />
                        <div>
                          <span className="font-medium text-gray-900">{board.name}</span>
                          {board.description && (
                            <p className="text-sm text-gray-500">{board.description}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">You haven't created any boards yet</p>
                  <Link
                    to="/boards"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-900 to-gray-700 text-white rounded-lg hover:from-red-700 hover:to-red-500"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Board</span>
                  </Link>
                </div>
              )}

              <button
                onClick={() => setShowBoardModal(null)}
                className="w-full mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}