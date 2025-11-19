import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Globe, Sparkles, Bell, Save, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface UserPreferences {
  preferredCategories: string[];
  language: string;
  summaryLength: string;
  pushNotifications: boolean;
  emailDigest: boolean;
}

const categories = [
  { id: 'technology', name: 'Technology' },
  { id: 'science', name: 'Science' },
  { id: 'business', name: 'Business' },
  { id: 'sports', name: 'Sports' },
  { id: 'politics', name: 'Politics' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'environment', name: 'Environment' },
  { id: 'health', name: 'Health' },
];

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
];

const summaryLengths = [
  { value: 'short', label: 'Short', description: '~60-150 words' },
  { value: 'medium', label: 'Medium', description: '~120-300 words' },
  { value: 'long', label: 'Long', description: '~200-500 words' },
];

export function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    preferredCategories: ['technology', 'science', 'health'],
    language: 'en',
    summaryLength: 'medium',
    pushNotifications: true,
    emailDigest: true,
  });

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setUsername(user.email?.split('@')[0] || '');
      loadPreferences();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const docRef = doc(db, 'preferences', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setPreferences({
          preferredCategories: data.preferredCategories || ['technology', 'science', 'health'],
          language: data.language || 'en',
          summaryLength: data.summaryLength || 'medium',
          pushNotifications: data.pushNotifications ?? true,
          emailDigest: data.emailDigest ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const docRef = doc(db, 'preferences', user.uid);
      await setDoc(docRef, {
        preferredCategories: preferences.preferredCategories,
        language: preferences.language,
        summaryLength: preferences.summaryLength,
        pushNotifications: preferences.pushNotifications,
        emailDigest: preferences.emailDigest,
        updatedAt: new Date().toISOString()
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(categoryId)
        ? prev.preferredCategories.filter(c => c !== categoryId)
        : [...prev.preferredCategories, categoryId]
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to access settings</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to customize your experience.</p>
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
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Home
          </Link>
          
          <nav className="flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-blue-600">News</Link>
            <Link to="/bookmarks" className="text-gray-700 hover:text-blue-600">Bookmarks</Link>
            <Link to="/activities" className="text-gray-700 hover:text-blue-600">Activity</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">Customize your DailyDrizzle experience</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <User className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </motion.div>

            {/* Language Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Language Preferences</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  News articles and summaries will be translated to your preferred language
                </p>
              </div>
            </motion.div>

            {/* AI Summary Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">AI Summary Preferences</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Default Summary Length
                </label>
                <div className="space-y-3">
                  {summaryLengths.map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        preferences.summaryLength === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="summaryLength"
                          value={option.value}
                          checked={preferences.summaryLength === option.value}
                          onChange={(e) => setPreferences(prev => ({ ...prev, summaryLength: e.target.value }))}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className="font-medium text-gray-900">{option.label}</span>
                          <p className="text-sm text-gray-500">{option.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Category Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Category Preferences</h2>
              </div>

              <p className="text-sm text-gray-600 mb-4">Follow categories to get personalized news</p>
              
              <div className="grid grid-cols-2 gap-3">
                {categories.map(category => (
                  <label
                    key={category.id}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={preferences.preferredCategories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </label>
                ))}
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Bell className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700">Push notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.pushNotifications}
                    onChange={(e) => setPreferences(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700">Daily email digest</span>
                  <input
                    type="checkbox"
                    checked={preferences.emailDigest}
                    onChange={(e) => setPreferences(prev => ({ ...prev, emailDigest: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Save Button */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveSettings}
              disabled={saving}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-slate-600 to-sky-800 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium shadow-md disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Save Settings</span>
                </>
              )}
            </motion.button>

            {/* Account Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-3">Account</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  Member since: <span className="font-medium text-gray-900">{format(new Date(user.metadata.creationTime || Date.now()), 'MMM d, yyyy')}</span>
                </p>
                <p className="text-gray-600">
                  Account verified: <span className="font-medium text-green-600">Yes</span>
                </p>
                <p className="text-gray-600">
                  Subscription: <span className="font-medium text-gray-900">Free</span>
                </p>
              </div>
            </motion.div>

            {/* Feature Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200"
            >
              <Sparkles className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">AI Features</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✨ Smart summarization</li>
                <li>🌐 Multi-language support</li>
                <li>🎯 Personalized feed</li>
                <li>📱 Push notifications</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
