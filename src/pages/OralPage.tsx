import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, RotateCcw } from 'lucide-react';
import { storage } from '../lib/storage';
import { streamOralResponse } from '../lib/ai';
import type { OralSession, OralMessage } from '../types';

export default function OralPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<OralSession | null>(null);
  const [messages, setMessages] = useState<OralMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const found = storage.getOralSessions().find((s) => s.id === sessionId);
    if (!found) { navigate(`/subject/${id}`); return; }
    setSession(found);
    setMessages(found.messages);
    if (found.messages.length === 0) {
      kickoffSession(found);
    }
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMsg]);

  async function kickoffSession(s: OralSession) {
    setLoading(true);
    setError('');
    let aiText = '';
    try {
      const initMsg = { role: 'user' as const, content: `Please start the oral examination session on the topic: "${s.topic}". Ask me your first question.` };
      for await (const chunk of streamOralResponse(
        [{ role: 'user', content: initMsg.content }],
        s.topic,
        s.language
      )) {
        aiText += chunk;
        setStreamingMsg(aiText);
      }
      const aiMsg: OralMessage = { role: 'ai', content: aiText };
      const updatedMsgs = [aiMsg];
      saveMessages(s, updatedMsgs);
      setMessages(updatedMsgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to AI');
    } finally {
      setLoading(false);
      setStreamingMsg('');
    }
  }

  function saveMessages(s: OralSession, msgs: OralMessage[]) {
    const all = storage.getOralSessions();
    const updated = all.map((o) => o.id === s.id ? { ...o, messages: msgs } : o);
    storage.saveOralSessions(updated);
  }

  async function sendMessage() {
    if (!input.trim() || loading || !session) return;
    const userMsg: OralMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    let aiText = '';
    try {
      const history = newMessages.map((m) => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }));
      for await (const chunk of streamOralResponse(history, session.topic, session.language)) {
        aiText += chunk;
        setStreamingMsg(aiText);
      }
      const aiMsg: OralMessage = { role: 'ai', content: aiText };
      const withAI = [...newMessages, aiMsg];
      saveMessages(session, withAI);
      setMessages(withAI);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setStreamingMsg('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function resetSession() {
    if (!session) return;
    setMessages([]);
    const all = storage.getOralSessions();
    const updated = all.map((o) => o.id === session.id ? { ...o, messages: [] } : o);
    storage.saveOralSessions(updated);
    kickoffSession(session);
  }

  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col h-[calc(100vh-65px)]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">{session.title}</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {session.language !== 'English' ? `${session.language} · ` : ''}Topic: {session.topic}
          </p>
        </div>
        <button
          onClick={resetSession}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'ai'
                  ? 'bg-[#1a1a24] border border-white/10 text-white/90 rounded-tl-sm'
                  : 'bg-violet-600 text-white rounded-tr-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming */}
        {streamingMsg && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1a1a24] border border-white/10 text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
              {streamingMsg}
              <span className="inline-block w-1.5 h-4 bg-violet-400 ml-1 animate-pulse align-text-bottom" />
            </div>
          </div>
        )}

        {loading && !streamingMsg && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1a1a24] border border-white/10">
              <div className="flex gap-1 items-center h-5">
                <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="flex-1 bg-[#1a1a24] border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none transition-colors disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="p-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
