import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Clock, Bookmark, Heart, Sparkles, Loader,
  ArrowLeft, TrendingUp, Filter, Calendar, Trash2, BarChart3,
  SparklesIcon, StarIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { format, formatDistanceToNow, startOfDay, endOfDay, subDays } from 'date-fns';
import { Link } from 'react-router-dom';

interface ActivityItem {
  id: string;
  type: 'read' | 'bookmark' | 'like' | 'summarize';
  article_id: string;
  article_title: string;
  timestamp: any;
}

type FilterType = 'all' | 'bookmark' | 'like' | 'summarize';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

export function ActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState({
    bookmarks: 0,
    likes: 0,
    summarized: 0,
    total: 0
  });

  useEffect(() => {
    if (user) {
      fetchActivities();
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    filterActivities();
  }, [activities, selectedFilter, timeFilter]);

  const fetchActivities = async () => {
    if (!user) return;
    try {
      const activitiesRef = collection(db, 'activities');
      const q = query(
        activitiesRef,
        where('user_id', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const activitiesData: ActivityItem[] = [];
      querySnapshot.forEach((doc) => {
        activitiesData.push({ id: doc.id, ...doc.data() } as ActivityItem);
      });
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      const bookmarksRef = collection(db, 'bookmarks');
      const bookmarksQuery = query(bookmarksRef, where('user_id', '==', user.uid));
      const bookmarksSnapshot = await getDocs(bookmarksQuery);

      const likesRef = collection(db, 'likes');
      const likesQuery = query(likesRef, where('user_id', '==', user.uid));
      const likesSnapshot = await getDocs(likesQuery);

      const activitiesRef = collection(db, 'activities');
      const activitiesQuery = query(activitiesRef, where('user_id', '==', user.uid));
      const activitiesSnapshot = await getDocs(activitiesQuery);

      const summarizeQuery = query(
        activitiesRef,
        where('user_id', '==', user.uid),
        where('type', '==', 'summarize')
      );
      const summarizeSnapshot = await getDocs(summarizeQuery);

      setStats({
        bookmarks: bookmarksSnapshot.size,
        likes: likesSnapshot.size,
        summarized: summarizeSnapshot.size,
        total: activitiesSnapshot.size
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(a => a.type === selectedFilter);
    }
    if (timeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(activity => {
        if (!activity.timestamp?.toDate) return false;
        const activityDate = activity.timestamp.toDate();
        switch (timeFilter) {
          case 'today':
            return activityDate >= startOfDay(now) && activityDate <= endOfDay(now);
          case 'week':
            return activityDate >= subDays(now, 7);
          case 'month':
            return activityDate >= subDays(now, 30);
          default:
            return true;
        }
      });
    }
    setFilteredActivities(filtered);
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await deleteDoc(doc(db, 'activities', activityId));
      setActivities(prev => prev.filter(a => a.id !== activityId));
      setShowDeleteConfirm(null);
      fetchStats();
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Failed to delete activity');
    }
  };

  const clearAllActivities = async () => {
    if (!confirm('Are you sure you want to clear all activities? This cannot be undone.')) return;
    try {
      const activitiesRef = collection(db, 'activities');
      const q = query(activitiesRef, where('user_id', '==', user?.uid));
      const snapshot = await getDocs(q);
      for (const document of snapshot.docs) {
        await deleteDoc(doc(db, 'activities', document.id));
      }
      setActivities([]);
      fetchStats();
    } catch (error) {
      console.error('Error clearing activities:', error);
      alert('Failed to clear activities');
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'bookmark':
        return <Bookmark className="h-5 w-5 text-gray-400" />;
      case 'like':
        return <Heart className="h-5 w-5 text-gray-400" />;
      case 'summarize':
        return <Sparkles className="h-5 w-5 text-gray-400" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'bookmark':
        return 'Bookmarked';
      case 'like':
        return 'Liked';
      case 'summarize':
        return 'Summarized';
      default:
        return 'Activity';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white from-sk flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view activity</h2>
          <p className="text-gray-500 mb-6">Track your reading history and interactions</p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium transition-colors"
          >
            Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-10 w-10 animate-spin text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Loading your activity...</p>
        </div>
      </div>
    );
  }

    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-gray-100 to-gray-100">
          {/* Header */}
          <header className="bg-black/40 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2 text-gray-900 hover:text-white transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="font-medium">Back to Home</span>
                </Link>

            {activities.length > 0 && (
              <button
                onClick={clearAllActivities}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-sm">Clear All</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-200">
              <Activity className="h-7 w-7 text-gray-500" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-1">Your Activity</h1>
              <p className="text-gray-500">Track your reading journey and interactions</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Activities', value: stats.total, icon: BarChart3 },
            { label: 'Bookmarks', value: stats.bookmarks, icon: StarIcon },
            { label: 'Likes', value: stats.likes, icon: Heart },
            { label: 'Summarized', value: stats.summarized, icon: SparklesIcon },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="h-6 w-6 text-gray-400" />
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-900" />
            <div className="flex space-x-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'bookmark', label: 'Bookmarks' },
                { value: 'like', label: 'Likes' },
                { value: 'summarize', label: 'Summaries' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedFilter(filter.value as FilterType)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedFilter === filter.value
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          {/* Time Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-900" />
            <div className="flex space-x-2">
              {[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value as TimeFilter)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeFilter === filter.value
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Activity Timeline</h2>
              <span className="text-sm text-gray-700">{filteredActivities.length} activities</span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            <AnimatePresence mode="popLayout">
              {filteredActivities.length > 0 ? (
                filteredActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-6 hover:bg-gray-100 transition-all duration-200 group"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-white text-gray-900 border border-gray-200 shadow-sm"
                      >
                        {getActivityIcon(activity.type)}
                      </motion.div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {getActivityLabel(activity.type)}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {activity.article_title}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>
                                {activity.timestamp?.toDate
                                  ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })
                                  : 'Just now'
                                }
                              </span>
                              {activity.timestamp?.toDate && (
                                <>
                                  <span>•</span>
                                  <span>{format(activity.timestamp.toDate(), 'MMM d, h:mm a')}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {/* Delete Button */}
                          <button
                            onClick={() => setShowDeleteConfirm(activity.id)}
                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all"
                            title="Delete activity"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-16 text-center"
                >
                  <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No activities found</h3>
                  <p className="text-gray-500 mb-6">
                    {selectedFilter !== 'all' || timeFilter !== 'all'
                      ? 'Try adjusting your filters to see more activities'
                      : 'Start reading, bookmarking, and sharing articles to see your activity here'}
                  </p>
                  <Link
                    to="/"
                    className="inline-block px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                  >
                    Browse Articles
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Activity?</h3>
              <p className="text-gray-600 mb-6">
                This will permanently remove this activity from your timeline.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteActivity(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
