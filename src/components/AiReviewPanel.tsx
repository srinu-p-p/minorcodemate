import React, { useState } from 'react';
import {
  Sparkles,
  X,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Copy,
  Check,
  RotateCw,
  Cpu,
} from 'lucide-react';
import { CodeReviewResult, CodeReviewIssue } from '../types/index.js';

interface AiReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  result: CodeReviewResult | null;
  isLoading: boolean;
  error: string | null;
  onRerun: () => void;
}

export const AiReviewPanel: React.FC<AiReviewPanelProps> = ({
  isOpen,
  onClose,
  result,
  isLoading,
  error,
  onRerun,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredIssues = result?.issues.filter((issue) => {
    if (filterSeverity === 'all') return true;
    return issue.severity === filterSeverity;
  }) || [];

  const getSeverityBadge = (severity: CodeReviewIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/60 px-2 py-0.5 rounded">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            <span>Critical</span>
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Warning</span>
          </span>
        );
      case 'suggestion':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 bg-sky-950/40 border border-sky-800/60 px-2 py-0.5 rounded">
            <Info className="w-3 h-3 text-sky-400" />
            <span>Suggestion</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] md:w-[540px] bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col select-none text-xs">
      {/* Header */}
      <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">AI Code Review</h3>
            <p className="text-[11px] text-slate-400">Automated syntax, logic, security, & risk audit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRerun}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
            title="Re-run Review"
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Analyzing Code with AI...</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Calling Ollama local engine (or cloud fallback) for deep syntactic and security review
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-lg text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>Review Error</span>
            </div>
            <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
            <button
              onClick={onRerun}
              className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-600 rounded transition-colors"
            >
              Retry Review
            </button>
          </div>
        ) : result ? (
          <>
            {/* Model & Provider Badge */}
            <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded border border-slate-800 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-1.5 truncate">
                <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-300 font-semibold">{result.provider}</span>
                <span className="text-slate-600">·</span>
                <span className="text-indigo-400">{result.model}</span>
              </div>
              <span className="text-slate-500 text-[10px] shrink-0">
                {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Assessment Banner */}
            <div
              className={`p-3.5 rounded-lg border flex items-start gap-3 ${
                result.assessment === 'clean'
                  ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                  : result.assessment === 'critical_issues_found'
                  ? 'bg-rose-950/20 border-rose-800/50 text-rose-200'
                  : 'bg-amber-950/20 border-amber-800/50 text-amber-200'
              }`}
            >
              {result.assessment === 'clean' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : result.assessment === 'critical_issues_found' ? (
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs capitalize text-slate-100">
                  {result.assessment.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-300 text-xs">
                Identified Issues ({result.issues.length})
              </span>
              <div className="flex items-center gap-1">
                {(['all', 'critical', 'warning', 'suggestion'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    className={`px-2 py-0.5 rounded text-[11px] capitalize transition-colors ${
                      filterSeverity === sev
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Issues List */}
            {filteredIssues.length === 0 ? (
              <div className="py-6 text-center text-slate-500 bg-slate-950/50 rounded border border-slate-800">
                <p>No issues found for this filter criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        {getSeverityBadge(issue.severity)}
                        <span className="font-semibold text-slate-200 truncate">{issue.title}</span>
                      </div>
                      {issue.line && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                          Ln {issue.line}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-300 leading-relaxed text-xs">{issue.description}</p>

                    <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1.5">
                      <div className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
                        <span>Recommendation:</span>
                      </div>
                      <p className="text-slate-300 text-xs">{issue.suggestion}</p>

                      {issue.fixedCodeSnippet && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono text-slate-400">Suggested Code Fix:</span>
                            <button
                              onClick={() => handleCopy(issue.id, issue.fixedCodeSnippet || '')}
                              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200"
                            >
                              {copiedId === issue.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedId === issue.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <pre className="p-2 bg-slate-950 rounded font-mono text-[11px] text-emerald-300 overflow-x-auto border border-emerald-950/60">
                            <code>{issue.fixedCodeSnippet}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Architecture Strengths */}
            {result.strengths && result.strengths.length > 0 && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <h4 className="font-semibold text-emerald-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Strengths Observed</span>
                </h4>
                <ul className="space-y-1 pl-4 list-disc text-slate-300 text-xs">
                  {result.strengths.map((str, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {str}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <h4 className="font-semibold text-indigo-400 text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Long-term Best Practices</span>
                </h4>
                <ul className="space-y-1 pl-4 list-disc text-slate-300 text-xs">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <p>Click "AI Review" above to run code analysis.</p>
          </div>
        )}
      </div>
    </div>
  );
};
