// Main Application Router
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { HomePage } from './pages/HomePage';
import { BoardsPage } from './pages/BoardsPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/settingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boards" element={<BoardsPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;