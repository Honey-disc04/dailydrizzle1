import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Folder, X, Save, Loader, ArrowLeft } from 'lucide-react';
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
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { Link } from 'react-router-dom';

interface Board {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  article_count?: number;
}

const COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
];

export function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLORS[0]
  });
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadBoards();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadBoards = async () => {
    if (!user) {
      console.log('❌ No user found');
      return;
    }

    console.log('🔍 Starting to load boards for user:', user.uid);
    console.log('📧 User email:', user.email);

    try {
      const boardsRef = collection(db, 'boards');
      console.log('📦 Collection reference created');
      
      const q = query(boardsRef, where('user_id', '==', user.uid));
      console.log('🔎 Query created with user_id:', user.uid);
      
      const snapshot = await getDocs(q);
      console.log('📊 Query executed. Documents found:', snapshot.size);

      if (snapshot.empty) {
        console.log('⚠️ Query returned empty! Checking all boards...');
        
        // Let's check ALL boards to debug
        const allBoardsSnapshot = await getDocs(collection(db, 'boards'));
        console.log('📋 Total boards in database:', allBoardsSnapshot.size);
        
        allBoardsSnapshot.forEach((doc) => {
          console.log('Board document:', {
            id: doc.id,
            data: doc.data(),
            user_id_in_doc: doc.data().user_id,
            user_id_searching: user.uid,
            match: doc.data().user_id === user.uid
          });
        });
      }

      const boardsList: Board[] = [];
      
      // Get bookmark counts for each board
      for (const boardDoc of snapshot.docs) {
        const boardData = { id: boardDoc.id, ...boardDoc.data() } as Board;
        
        console.log('✅ Found board:', {
          id: boardDoc.id,
          name: boardData.name,
          user_id: boardData.user_id
        });
        
        // Count bookmarks in this board
        const bookmarksRef = collection(db, 'bookmarks');
        const bookmarksQuery = query(
          bookmarksRef, 
          where('user_id', '==', user.uid),
          where('board_id', '==', boardDoc.id)
        );
        const bookmarksSnapshot = await getDocs(bookmarksQuery);
        
        boardData.article_count = bookmarksSnapshot.size;
        console.log('  └─ Articles in this board:', boardData.article_count);
        
        boardsList.push(boardData);
      }

      console.log('✅ Total boards loaded:', boardsList.length);
      console.log('📋 Boards list:', boardsList);
      
      setBoards(boardsList);
    } catch (error) {
      console.error('❌ Error loading boards:', error);
    } finally {
      setLoading(false);
      console.log('🏁 Loading complete');
    }
  };

  const handleCreateBoard = async () => {
    if (!user || !formData.name.trim()) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'boards'), {
        user_id: user.uid,
        name: formData.name,
        description: formData.description,
        color: formData.color,
        created_at: Timestamp.now().toDate().toISOString()
      });

      setFormData({ name: '', description: '', color: COLORS[0] });
      setShowCreateModal(false);
      loadBoards();
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBoard = async () => {
    if (!user || !editingBoard || !formData.name.trim()) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'boards', editingBoard.id), {
        name: formData.name,
        description: formData.description,
        color: formData.color
      });

      setFormData({ name: '', description: '', color: COLORS[0] });
      setEditingBoard(null);
      loadBoards();
    } catch (error) {
      console.error('Error updating board:', error);
      alert('Failed to update board');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure? This will also remove all bookmarks in this board.')) return;

    try {
      // Delete all bookmarks in this board
      const bookmarksRef = collection(db, 'bookmarks');
      const q = query(bookmarksRef, where('board_id', '==', boardId));
      const snapshot = await getDocs(q);
      
      for (const bookmarkDoc of snapshot.docs) {
        await deleteDoc(doc(db, 'bookmarks', bookmarkDoc.id));
      }

      // Delete the board
      await deleteDoc(doc(db, 'boards', boardId));
      loadBoards();
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board');
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '', description: '', color: COLORS[0] });
    setShowCreateModal(true);
  };

  const openEditModal = (board: Board) => {
    setFormData({
      name: board.name,
      description: board.description,
      color: board.color
    });
    setEditingBoard(board);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to create boards</h2>
          <p className="text-gray-600 mb-6">Organize your favorite articles with custom boards.</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 text-gray-700 hover:text-blue-600">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Home</span>
            </Link>

            <nav className="flex items-center space-x-6">
              <Link to="/bookmarks" className="text-gray-700 hover:text-blue-600">Bookmarks</Link>
              <Link to="/activities" className="text-gray-700 hover:text-blue-600">Activity</Link>
              <Link to="/settings" className="text-gray-700 hover:text-blue-600">Settings</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Boards</h1>
            <p className="text-gray-600">Organize your saved articles into custom collections</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium shadow-md"
          >
            <Plus className="h-5 w-5" />
            <span>Create Board</span>
          </motion.button>
        </div>

        {/* Boards Grid */}
        {boards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Folder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No boards yet</h3>
            <p className="text-gray-600 mb-6">Create your first board to start organizing articles</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
            >
              <Plus className="h-5 w-5" />
              <span>Create Your First Board</span>
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => (
              <motion.div
                key={board.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-xl shadow-md overflow-hidden group"
              >
                <div 
                  className="h-32 flex items-center justify-center relative"
                  style={{ backgroundColor: board.color }}
                >
                  <Folder className="h-16 w-16 text-white opacity-80" />
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(board)}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => handleDeleteBoard(board.id)}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <Link to={`/bookmarks?board=${board.id}`} className="block p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {board.name}
                  </h3>
                  {board.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {board.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{board.article_count || 0} articles</span>
                    <span>Created {new Date(board.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || editingBoard) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCreateModal(false);
              setEditingBoard(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingBoard ? 'Edit Board' : 'Create New Board'}
                </h3>
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingBoard(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Board Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Tech News, Travel Ideas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What's this board about?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex space-x-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg transition-transform ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingBoard(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={editingBoard ? handleUpdateBoard : handleCreateBoard}
                  disabled={saving || !formData.name.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{editingBoard ? 'Update' : 'Create'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}