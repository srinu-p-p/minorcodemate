import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar.js';
import { useAuth } from '../context/AuthContext.js';
import { authApi, aiApi } from '../services/api.js';
import {
  User,
  Cpu,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Terminal,
  Server,
  BookOpen,
} from 'lucide-react';
import { ArchitectureModal } from '../components/ArchitectureModal.js';

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [showArchDocs, setShowArchDocs] = useState(false);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // AI Status State
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [isCheckingAi, setIsCheckingAi] = useState(false);

  const fetchAiStatus = async () => {
    setIsCheckingAi(true);
    try {
      const status = await aiApi.status();
      setAiStatus(status);
    } catch (err: any) {
      console.error('Failed to query AI status:', err);
    } finally {
      setIsCheckingAi(false);
    }
  };

  useEffect(() => {
    fetchAiStatus();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage('');
    try {
      const res = await authApi.updateProfile({ name, role });
      updateUser(res.user);
      setProfileMessage('Profile settings updated successfully.');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err: any) {
      setProfileMessage(err.response?.data?.error || err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col select-none">
      <Navbar onOpenArchitectureDocs={() => setShowArchDocs(true)} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Settings & Engine Configuration</h1>
          <p className="text-xs text-slate-400 mt-1">
            Personalize your developer profile and inspect local AI and database runtime parameters
          </p>
        </div>

        {/* Profile Card */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <User className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">Developer Profile</h2>
          </div>

          {profileMessage && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-lg text-xs text-indigo-300">
              {profileMessage}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Engineering Role / Title</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Email (Immutable Account ID)</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed font-mono"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-xs shadow-sm"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* AI Engine Status Card */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-slate-100">AI Model Provider Configuration</h2>
            </div>
            <button
              onClick={fetchAiStatus}
              disabled={isCheckingAi}
              className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700 text-xs transition-colors"
            >
              <RotateCw className={`w-3 h-3 ${isCheckingAi ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400">Primary Local AI Engine</span>
              <p className="font-semibold text-slate-200">Ollama HTTP API</p>
              <p className="font-mono text-[11px] text-indigo-400">
                {aiStatus?.ollamaBaseUrl || 'http://localhost:11434'}
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400">Target Model Name</span>
              <p className="font-semibold text-slate-200">
                {aiStatus?.configuredModel || 'qwen2.5:3b'}
              </p>
              <p className="text-[11px] text-slate-500">Configurable via OLLAMA_MODEL env</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400">Cloud Fallback Resilience</span>
              <p className="font-semibold text-slate-200">Google Gemini 3.8 Flash</p>
              <p className="text-[11px] text-emerald-400">
                {aiStatus?.hasGeminiFallback ? 'Active & Ready' : 'API Key not provided'}
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400">Real-Time Sync Protocol</span>
              <p className="font-semibold text-slate-200">Yjs CRDT + y-websocket</p>
              <p className="text-[11px] text-slate-400 font-mono">/yjs-ws & /socket.io</p>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 leading-relaxed">
            <p>
              <strong className="text-slate-300">How AI works in CodeSync:</strong> When you run "AI Review" or "AI Explain", the server first calls your local Ollama daemon at <code className="text-indigo-400">http://localhost:11434</code> with model <code className="text-indigo-400">qwen2.5:3b</code>. If Ollama is not currently active on your local machine, CodeSync seamlessly uses its Gemini 3.8 Flash cloud fallback so your development reviews never stall.
            </p>
          </div>
        </div>

        {/* Documentation & Architecture Button */}
        <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-xl flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Technical Specifications & Mermaid Diagram</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect database entity relationships, dual WebSocket pipelines, and testing results.
            </p>
          </div>
          <button
            onClick={() => setShowArchDocs(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shrink-0 shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open Architecture Docs</span>
          </button>
        </div>
      </main>

      <ArchitectureModal isOpen={showArchDocs} onClose={() => setShowArchDocs(false)} />
    </div>
  );
};
