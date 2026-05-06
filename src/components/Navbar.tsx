import { Link } from 'react-router-dom';
import { Settings, BookOpen } from 'lucide-react';

export default function Navbar() {

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
        <BookOpen size={22} className="text-violet-400" />
      </Link>
      <div className="flex items-center gap-3">
        <Link
          to="/settings"
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <Settings size={18} />
        </Link>
      </div>
    </nav>
  );
}
