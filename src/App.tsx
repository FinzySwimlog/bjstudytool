import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SubjectPage from './pages/SubjectPage';
import FlashcardsPage from './pages/FlashcardsPage';
import EditFlashcardsPage from './pages/EditFlashcardsPage';
import SettingsPage from './pages/SettingsPage';
import Navbar from './components/Navbar';
import PasswordGate from './components/PasswordGate';

export default function App() {
  return (
    <PasswordGate>
      <div className="min-h-screen bg-[#0f0f13]">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/subject/:id" element={<SubjectPage />} />
          <Route path="/subject/:id/flashcards/:setId" element={<FlashcardsPage />} />
          <Route path="/subject/:id/flashcards/:setId/edit" element={<EditFlashcardsPage />} />
<Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </PasswordGate>
  );
}
