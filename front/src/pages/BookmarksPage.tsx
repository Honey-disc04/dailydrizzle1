import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Search, Trash2, Loader } from 'lucide-react';
import { ArticleCard } from '../components/News/ArticleCard';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Article } from '../types';
import { Link } from 'react-router-dom';

export function BookmarksPage() {
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchBookmarks = async () => {
    if (!user) return;

    try {
      const bookmarksRef = collection(db, 'bookmarks');
      const q = query(bookmarksRef, where('user_id', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const articles: Article[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        articles.push({
          ...data.article_data,
          bookmarkId: doc.id
        } as Article & { bookmarkId: string });
      });
      
      setBookmarkedArticles(articles);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = bookmarkedArticles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveBookmark = async (articleId: string) => {
    if (!user) return;

    try {
      const bookmarksRef = collection(db, 'bookmarks');
      const q = query(
        bookmarksRef, 
        where('user_id', '==', user.uid), 
        where('article_id', '==', articleId)
      );
      const snapshot = await getDocs(q);
      
      snapshot.forEach(async (document) => {
        await deleteDoc(doc(db, 'bookmarks', document.id));
      });

      setBookmarkedArticles(prev => prev.filter(article => article.id !== articleId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const clearAllBookmarks = async () => {
    if (!user || !window.confirm('Are you sure you want to remove all bookmarks?')) return;

    try {
      const bookmarksRef = collection(db, 'bookmarks');
      const q = query(bookmarksRef, where('user_id', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(document => 
        deleteDoc(doc(db, 'bookmarks', document.id))
      );
      
      await Promise.all(deletePromises);
      setBookmarkedArticles([]);
    } catch (error) {
      console.error('Error clearing bookmarks:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view bookmarks</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to access your bookmarked articles.</p>
          <Link 
            to="/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your bookmarks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bookmark className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Your Bookmarks</h1>
                <p className="text-gray-600">
                  {bookmarkedArticles.length} saved {bookmarkedArticles.length === 1 ? 'article' : 'articles'}
                </p>
              </div>
            </div>

            {bookmarkedArticles.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearAllBookmarks}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors font-medium"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear all</span>
              </motion.button>
            )}
          </div>

          {/* Search Bar */}
          {bookmarkedArticles.length > 0 && (
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search your bookmarks..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Bookmarked Articles */}
        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isBookmarked={true}
                  onBookmark={handleRemoveBookmark}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : bookmarkedArticles.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookmarks found</h3>
            <p className="text-gray-600">
              Try adjusting your search term to find your bookmarked articles.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookmarks yet</h3>
            <p className="text-gray-600 mb-6">
              Start bookmarking articles to read them later. Look for the bookmark icon on any article.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
            >
              Browse Articles
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}