import { BookOpen, Cloud, Lock } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

      <div className="space-y-4">
        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Cloud size={18} className="text-violet-400" />
            </div>
            <h2 className="text-white font-medium">Data Storage</h2>
          </div>
          <p className="text-white/50 text-sm leading-relaxed">
            All your subjects, flashcard sets, and oral sessions are saved to a cloud database. Your data is available on any device after logging in.
          </p>
        </div>

        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Lock size={18} className="text-violet-400" />
            </div>
            <h2 className="text-white font-medium">Access</h2>
          </div>
          <p className="text-white/50 text-sm leading-relaxed">
            The app is protected by a password. Your session stays active until you close the tab.
          </p>
        </div>

        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <BookOpen size={18} className="text-violet-400" />
            </div>
            <h2 className="text-white font-medium">About</h2>
          </div>
          <p className="text-white/50 text-sm leading-relaxed">
            BJ's Study Tool — AI-powered flashcard generation, oral exam preparation, practice quizzes, and content summarisation.
          </p>
        </div>
      </div>
    </div>
  );
}
