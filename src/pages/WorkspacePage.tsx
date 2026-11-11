import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext.js';
import { Navbar } from '../components/Navbar.js';
import { Sidebar } from '../components/Sidebar.js';
import { FileExplorer } from '../components/FileExplorer.js';
import { MonacoEditorView } from '../components/MonacoEditorView.js';
import { CollaboratorPresence } from '../components/CollaboratorPresence.js';
import { AiReviewPanel } from '../components/AiReviewPanel.js';
import { AiExplainPanel } from '../components/AiExplainPanel.js';
import { ArchitectureModal } from '../components/ArchitectureModal.js';
import { aiApi } from '../services/api.js';
import { CodeReviewResult, CodeExplanationResult } from '../types/index.js';
import { Camera, Sparkles, HelpCircle } from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, activeFile, loadProject, isLoading, error, takeSnapshot, userRole } = useProject();

  const [showArchDocs, setShowArchDocs] = useState(false);

  // AI Review Drawer State
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // AI Explain Drawer State
  const [showExplainPanel, setShowExplainPanel] = useState(false);
  const [explainResult, setExplainResult] = useState<CodeExplanationResult | null>(null);
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Current active code snippet for AI operations
  const [currentAiCode, setCurrentAiCode] = useState('');

  // Snapshot modal quick trigger
  const [showQuickSnapshotModal, setShowQuickSnapshotModal] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  const handleTriggerAiReview = async (codeSnippet?: string) => {
    if (!activeFile) return;
    const targetCode = codeSnippet || activeFile.content;
    setCurrentAiCode(targetCode);
    setShowReviewPanel(true);
    setShowExplainPanel(false);
    setIsReviewLoading(true);
    setReviewError(null);

    try {
      const result = await aiApi.review({
        code: targetCode,
        language: activeFile.language,
        filePath: activeFile.path,
      });
      setReviewResult(result);
    } catch (err: any) {
      setReviewError(err.response?.data?.details || err.message || 'AI review failed');
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleTriggerAiExplain = async (codeSnippet?: string) => {
    if (!activeFile) return;
    const targetCode = codeSnippet || activeFile.content;
    setCurrentAiCode(targetCode);
    setShowExplainPanel(true);
    setShowReviewPanel(false);
    setIsExplainLoading(true);
    setExplainError(null);

    try {
      const result = await aiApi.explain({
        code: targetCode,
        language: activeFile.language,
        context: `Workspace file: ${activeFile.path}`,
      });
      setExplainResult(result);
    } catch (err: any) {
      setExplainError(err.response?.data?.details || err.message || 'AI explanation failed');
    } finally {
      setIsExplainLoading(false);
    }
  };

  const handleQuickSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotTitle.trim()) return;
    setIsTakingSnapshot(true);
    try {
      await takeSnapshot(snapshotTitle.trim());
      setSnapshotTitle('');
      setShowQuickSnapshotModal(false);
    } catch (err: any) {
      console.error('Failed to take snapshot:', err);
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar onOpenArchitectureDocs={() => setShowArchDocs(true)} />
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
          <p>Loading collaborative workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar onOpenArchitectureDocs={() => setShowArchDocs(true)} />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <p className="text-sm font-semibold text-rose-400 mb-2">Workspace Access Error</p>
          <p className="text-xs text-slate-400 max-w-md mb-4">{error || 'Project not found.'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden select-none">
      <Navbar onOpenArchitectureDocs={() => setShowArchDocs(true)} />

      {/* Workspace Secondary Sub-Bar */}
      <div className="h-9 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200 truncate">{project.name}</span>
          <span className="text-slate-600">·</span>
          <CollaboratorPresence />
        </div>

        <div className="flex items-center gap-2">
          {userRole !== 'viewer' && (
            <button
              onClick={() => {
                setSnapshotTitle(`Snapshot - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
                setShowQuickSnapshotModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors border border-slate-700/60"
              title="Save a complete snapshot of all workspace files"
            >
              <Camera className="w-3 h-3 text-amber-400" />
              <span>Snapshot</span>
            </button>
          )}

          <button
            onClick={() => handleTriggerAiReview()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/50 rounded transition-colors border border-indigo-800/50"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>AI Review</span>
          </button>

          <button
            onClick={() => handleTriggerAiExplain()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:text-sky-200 bg-sky-950/40 hover:bg-sky-900/50 rounded transition-colors border border-sky-800/50"
          >
            <HelpCircle className="w-3 h-3 text-sky-400" />
            <span>AI Explain</span>
          </button>
        </div>
      </div>

      {/* Main IDE Layout */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenDocs={() => setShowArchDocs(true)} />
        <FileExplorer />
        <MonacoEditorView
          onTriggerAiReview={handleTriggerAiReview}
          onTriggerAiExplain={handleTriggerAiExplain}
        />
      </div>

      {/* AI Panels */}
      <AiReviewPanel
        isOpen={showReviewPanel}
        onClose={() => setShowReviewPanel(false)}
        result={reviewResult}
        isLoading={isReviewLoading}
        error={reviewError}
        onRerun={() => handleTriggerAiReview(currentAiCode)}
      />

      <AiExplainPanel
        isOpen={showExplainPanel}
        onClose={() => setShowExplainPanel(false)}
        result={explainResult}
        isLoading={isExplainLoading}
        error={explainError}
        onRerun={() => handleTriggerAiExplain(currentAiCode)}
        currentCode={currentAiCode}
        currentLanguage={activeFile?.language || 'javascript'}
      />

      {/* Quick Snapshot Modal */}
      {showQuickSnapshotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Save Codebase Snapshot</h3>
            <p className="text-xs text-slate-400 mb-3">
              Capture current state of all files in this repository as an immutable checkpoint.
            </p>

            <form onSubmit={handleQuickSnapshot} className="space-y-3">
              <input
                type="text"
                value={snapshotTitle}
                onChange={(e) => setSnapshotTitle(e.target.value)}
                placeholder="Snapshot title"
                required
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickSnapshotModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTakingSnapshot || !snapshotTitle.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded disabled:opacity-50 transition-colors"
                >
                  {isTakingSnapshot ? 'Saving...' : 'Save Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Architecture & Documentation Modal */}
      <ArchitectureModal isOpen={showArchDocs} onClose={() => setShowArchDocs(false)} />
    </div>
  );
};
