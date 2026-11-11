import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Send,
  RotateCw,
  BookOpen,
  Cpu,
  Layers,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import { CodeExplanationResult } from '../types/index.js';
import { aiApi } from '../services/api.js';

interface AiExplainPanelProps {
  isOpen: boolean;
  onClose: () => void;
  result: CodeExplanationResult | null;
  isLoading: boolean;
  error: string | null;
  onRerun: () => void;
  currentCode: string;
  currentLanguage: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiExplainPanel: React.FC<AiExplainPanelProps> = ({
  isOpen,
  onClose,
  result,
  isLoading,
  error,
  onRerun,
  currentCode,
  currentLanguage,
}) => {
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAskingChat, setIsAskingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim() || isAskingChat) return;

    const q = followUpQuestion.trim();
    setFollowUpQuestion('');
    setChatError(null);

    const newHistory: ChatMessage[] = [
      ...chatHistory,
      { role: 'user', content: q, timestamp: new Date().toISOString() },
    ];
    setChatHistory(newHistory);
    setIsAskingChat(true);

    try {
      const response = await aiApi.chat({
        question: q,
        code: currentCode,
        language: currentLanguage,
        history: newHistory.map((m) => ({ role: m.role, content: m.content })),
      });

      setChatHistory([
        ...newHistory,
        { role: 'assistant', content: response.reply, timestamp: new Date().toISOString() },
      ]);
    } catch (err: any) {
      setChatError(err.response?.data?.details || err.message || 'Failed to get follow-up answer');
    } finally {
      setIsAskingChat(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[560px] bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col select-none text-xs">
      {/* Header */}
      <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">AI Code Mentor</h3>
            <p className="text-[11px] text-slate-400">Beginner-friendly breakdown, concept mapping & Q&A</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRerun}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
            title="Re-run Explanation"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400 animate-pulse">
              <BookOpen className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Deconstructing Code Logic...</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Generating beginner-friendly architectural walkthrough with Ollama qwen2.5:3b
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-lg text-rose-200 space-y-2">
            <p className="font-semibold text-xs text-rose-400">Explanation Error</p>
            <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
            <button
              onClick={onRerun}
              className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-600 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        ) : result ? (
          <>
            {/* Model & Provider Badge */}
            <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded border border-slate-800 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-1.5 truncate">
                <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-300 font-semibold">{result.provider}</span>
                <span className="text-slate-600">·</span>
                <span className="text-sky-400">{result.model}</span>
              </div>
              <span className="text-slate-500 text-[10px] shrink-0">
                {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Title & Overview Banner */}
            <div className="p-3.5 bg-sky-950/20 border border-sky-800/40 rounded-lg space-y-1.5">
              <h4 className="text-xs font-bold text-sky-300">{result.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{result.summary}</p>
            </div>

            {/* Execution Flow */}
            {result.executionFlow && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <h5 className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Execution Flow</span>
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{result.executionFlow}</p>
              </div>
            )}

            {/* Component Breakdown */}
            {result.breakdown && result.breakdown.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-semibold text-xs text-slate-200">Component Breakdown</h5>
                <div className="space-y-2">
                  {result.breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-indigo-300">
                          {item.component}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 text-[11px]">{item.purpose}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">{item.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Concepts */}
            {result.keyConcepts && result.keyConcepts.length > 0 && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <h5 className="font-semibold text-xs text-amber-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Key Programming Concepts</span>
                </h5>
                <div className="space-y-2">
                  {result.keyConcepts.map((kc, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <p className="font-semibold text-slate-200 text-xs">{kc.concept}</p>
                      <p className="text-slate-400 text-xs leading-relaxed">{kc.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Beginner Tip */}
            {result.beginnerTip && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg flex items-start gap-2.5 text-emerald-200">
                <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs text-emerald-300">Pro-Tip for Developers</p>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{result.beginnerTip}</p>
                </div>
              </div>
            )}

            {/* Follow-up Chat Q&A Section */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h5 className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Ask Follow-up Questions</span>
              </h5>

              {/* Chat Thread */}
              {chatHistory.length > 0 && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto p-2 bg-slate-950 rounded border border-slate-800">
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-950/40 border border-indigo-800/50 text-indigo-200 ml-4'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 mr-4'
                      }`}
                    >
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">
                        {msg.role === 'user' ? 'You' : 'CodeSync AI'}
                      </p>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}
                  {isAskingChat && (
                    <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
              )}

              {chatError && <p className="text-xs text-rose-400">{chatError}</p>}

              {/* Question input */}
              <form onSubmit={handleSendFollowUp} className="flex gap-2">
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="e.g. How does error handling work here?"
                  disabled={isAskingChat}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isAskingChat || !followUpQuestion.trim()}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <p>Click "AI Explain" above to deconstruct code concepts.</p>
          </div>
        )}
      </div>
    </div>
  );
};
