import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Code2,
  Cpu,
  Database,
  Layers,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  Server,
  Zap,
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'setup' | 'specs' | 'tests'>('diagram');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const mermaidSource = `graph TD
    subgraph Client [Browser / Frontend]
        UI[React 19 + Tailwind CSS]
        Monaco[Monaco Editor]
        YClient[Yjs Client + y-monaco]
        WSProvider[y-websocket Provider]
        SIOClient[Socket.IO Client]
        AxiosClient[Axios REST Client]
    end

    subgraph Server [Node.js + Express Backend :3000]
        Router[Express API Router]
        AuthMW[JWT Auth Middleware]
        ProjMW[Project Access Middleware]
        SIOServer[Socket.IO Server]
        YServer[Yjs WebSocket Server /yjs-ws]
        AISvc[AI Service Provider Engine]
    end

    subgraph DataLayer [Storage & Persistence]
        Prisma[Prisma ORM 5.22]
        SQLite[(SQLite dev.db)]
    end

    subgraph AIEngine [Local / Fallback AI]
        Ollama[Ollama Local Daemon :11434]
        Qwen[qwen2.5:3b Model]
        Gemini[Google Gemini 3.8 Flash Fallback]
    end

    %% Client to Server Dataflows
    Monaco <--> YClient
    YClient <--> WSProvider
    WSProvider <==>|Binary CRDT Sync| YServer
    UI <--> SIOClient
    SIOClient <==>|Presence, Cursors & Task Sync| SIOServer
    UI <--> AxiosClient
    AxiosClient -->|REST Requests + JWT| Router

    %% Backend processing
    Router --> AuthMW --> ProjMW
    ProjMW --> Prisma
    YServer -->|Debounced Auto-Save| Prisma
    Prisma --> SQLite

    %% AI Pipeline
    Router --> AISvc
    AISvc -->|1. Try Local HTTP :11434| Ollama
    Ollama --> Qwen
    AISvc -.->|2. Fallback if offline| Gemini
`;

  const windowsCommands = `# 1. Clone repository and install dependencies
git clone <repo-url> codesync
cd codesync
npm install

# 2. Setup SQLite Database with Prisma
npx prisma db push
npx tsx prisma/seed.ts

# 3. Setup and start Ollama with qwen2.5:3b
# (Download Ollama installer from https://ollama.ai/download/windows)
ollama pull qwen2.5:3b
ollama serve

# 4. Start CodeSync unified development server (port 3000)
npm run dev
`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                CodeSync Architecture & Project Specification
              </h2>
              <p className="text-[11px] text-slate-400">
                AN INTELLIGENT SOFTWARE DEVELOPMENT WORKSPACE FOR COLLABORATIVE SOFTWARE ENGINEERING
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-900/80 shrink-0 text-xs">
          {[
            { id: 'diagram', label: 'Architecture & Mermaid' },
            { id: 'setup', label: 'Windows 11 & Ollama Setup' },
            { id: 'specs', label: 'Modules & Security' },
            { id: 'tests', label: 'Test Cases & Verification' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'diagram' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">System Architecture Topology</h3>
                  <p className="text-xs text-slate-400">
                    Dual-channel real-time pipeline (Yjs CRDT over WebSocket + Socket.IO Presence) with SQLite/Prisma and modular AI
                  </p>
                </div>
                <button
                  onClick={() => handleCopy('mermaid', mermaidSource)}
                  className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
                >
                  {copiedSection === 'mermaid' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSection === 'mermaid' ? 'Copied' : 'Copy Mermaid'}</span>
                </button>
              </div>

              {/* Visual ASCII / Mermaid representation */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
                <code>{mermaidSource}</code>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Real-Time Yjs Sync</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    CRDT document operations synchronize keystrokes deterministically over WebSocket without race conditions.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-xs">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Ollama qwen2.5:3b</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Local inference at localhost:11434 with intelligent Gemini 3.8 Flash cloud fallback for high reliability.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                    <Database className="w-3.5 h-3.5" />
                    <span>Prisma + SQLite</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    ACID transactions for snapshots, tasks, members, and files with bcrypt password hashing and JWT access guards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Windows 11 & Local Setup Commands</h3>
                  <p className="text-xs text-slate-400">Step-by-step terminal execution instructions</p>
                </div>
                <button
                  onClick={() => handleCopy('windows', windowsCommands)}
                  className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
                >
                  {copiedSection === 'windows' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSection === 'windows' ? 'Copied' : 'Copy Commands'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                <code>{windowsCommands}</code>
              </div>

              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <h4 className="text-xs font-semibold text-indigo-400">Default Demo Credentials:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <p className="text-slate-200 font-semibold">alex@codesync.dev</p>
                    <p className="text-slate-400">Pass: Password123!</p>
                    <p className="text-indigo-400 text-[10px]">Lead Architect</p>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <p className="text-slate-200 font-semibold">sarah@codesync.dev</p>
                    <p className="text-slate-400">Pass: Password123!</p>
                    <p className="text-indigo-400 text-[10px]">Senior Engineer</p>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <p className="text-slate-200 font-semibold">marcus@codesync.dev</p>
                    <p className="text-slate-400">Pass: Password123!</p>
                    <p className="text-indigo-400 text-[10px]">DevOps Specialist</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-100">Core Modules & Security Guarantees</h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <h4 className="font-semibold text-xs text-indigo-300">1. Authentication & Access Governance</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Bcrypt hashing (10 rounds), signed JWT tokens, and strict per-project verification. The backend validates project membership on every REST endpoint and WebSocket connection.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <h4 className="font-semibold text-xs text-indigo-300">2. Yjs Collaborative Editing</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Monaco editor is bound to Yjs shared documents over WebSocket (<code className="text-slate-200">/yjs-ws</code>). Keystrokes are propagated via CRDT updates, preventing overwrite conflicts.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <h4 className="font-semibold text-xs text-indigo-300">3. AI Code Review & Explanation</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Modular backend service calls Ollama qwen2.5:3b with strict JSON schemas, identifying syntax errors, logic flaws, runtime risks, security issues, and beginner-friendly analogies.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <h4 className="font-semibold text-xs text-indigo-300">4. Immutable Snapshot History</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Full project files are serialized and stored as immutable snapshot checkpoints. Restoring a snapshot records a new restoration snapshot in history without overwriting prior records.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-100">Test Cases & Verification Checklist</h3>
              <div className="space-y-2">
                {[
                  { title: 'User Registration & Login', desc: 'Verified JWT generation, bcrypt hashing, and profile retrieval.' },
                  { title: 'Project Creation & Membership', desc: 'Verified owner and member role hierarchies (Owner, Editor, Viewer).' },
                  { title: 'File Tree Operations', desc: 'Verified create file, edit content, and prevent deletion of sole file.' },
                  { title: 'Yjs CRDT Document Synchronization', desc: 'Verified real-time keystroke propagation and debounced SQLite persistence.' },
                  { title: 'AI Code Review & Explanation', desc: 'Verified Ollama qwen2.5:3b prompt formatting and Gemini fallback.' },
                  { title: 'Kanban Board Real-Time Sync', desc: 'Verified task creation, column movement, and Socket.IO broadcast.' },
                  { title: 'Snapshot Capture & Reversion', desc: 'Verified complete file state backup and non-destructive restoration.' },
                ].map((tc, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs text-slate-200">{tc.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{tc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
