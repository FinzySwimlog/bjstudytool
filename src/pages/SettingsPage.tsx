import { useState, useEffect } from 'react';
import { Key, Check } from 'lucide-react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('anthropic_api_key') || '';
    setApiKey(key);
  }, []);

  function save() {
    localStorage.setItem('anthropic_api_key', apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Key size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-white font-medium">Anthropic API Key</h2>
            <p className="text-white/40 text-sm">Required for AI features</p>
          </div>
        </div>

        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors mb-4 font-mono text-sm"
        />

        <button
          onClick={save}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}
        >
          {saved ? <><Check size={15} /> Saved!</> : 'Save Key'}
        </button>

        <p className="text-white/30 text-xs mt-4 leading-relaxed">
          Your API key is stored only in your browser's local storage and never sent anywhere except directly to Anthropic's API.
        </p>
      </div>

      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 mt-4">
        <h2 className="text-white font-medium mb-2">About StudyKit</h2>
        <p className="text-white/40 text-sm leading-relaxed">
          A personal study tool with AI-powered flashcard generation, oral exam preparation, practice quizzes, and content summarisation. All data is stored locally in your browser.
        </p>
      </div>
    </div>
  );
}
