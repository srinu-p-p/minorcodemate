import React, { useState } from 'react';
import {
  History,
  Camera,
  RotateCcw,
  Eye,
  FileCode,
  Calendar,
  User,
  Check,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext.js';
import { Snapshot } from '../types/index.js';
import { snapshotsApi } from '../services/api.js';

export const SnapshotManager: React.FC = () => {
  const { project, snapshots, takeSnapshot, restoreSnapshot, userRole } = useProject();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Preview state
  const [inspectingSnapshot, setInspectingSnapshot] = useState<Snapshot | null>(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<any | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Restore confirmation
  const [snapshotToRestore, setSnapshotToRestore] = useState<Snapshot | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const canEdit = userRole === 'owner' || userRole === 'editor';

  const handleTakeSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await takeSnapshot(title.trim(), description.trim() || undefined);
      setTitle('');
      setDescription('');
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to capture snapshot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenInspect = async (snapshot: Snapshot) => {
    if (!project) return;
    setIsLoadingPreview(true);
    try {
      const data = await snapshotsApi.get(project.id, snapshot.id);
      setInspectingSnapshot(data);
      if (data.files && data.files.length > 0) {
        setSelectedPreviewFile(data.files[0]);
      } else {
        setSelectedPreviewFile(null);
      }
    } catch (err: any) {
      console.error('Failed to load snapshot details:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!snapshotToRestore) return;
    setIsRestoring(true);
    try {
      await restoreSnapshot(snapshotToRestore.id);
      setSnapshotToRestore(null);
      setInspectingSnapshot(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to restore snapshot');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/40">
        <div>
          <h2 className="text-sm font-bold text-slate-100">Snapshot History & Reversion</h2>
          <p className="text-[11px] text-slate-400">
            Immutable version checkpoints of your entire project file tree
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setTitle('');
              setDescription('');
              setErrorMsg('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Take Snapshot</span>
          </button>
        )}
      </div>

      {/* Snapshot Timeline List */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-4">
        {snapshots.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-lg border border-slate-800">
            <History className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">No Snapshots Yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Save complete snapshots of your codebase at key milestones. You can preview and restore them at any time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((s, idx) => (
              <div
                key={s.id}
                className="p-4 bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-100 truncate">{s.title}</span>
                    {s.isRestored && (
                      <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                        Restored Checkpoint
                      </span>
                    )}
                  </div>

                  {s.description && (
                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{s.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{s.creator?.name || 'Collaborator'}</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{new Date(s.createdAt).toLocaleString()}</span>
                    </div>
                    <span>·</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {s.fileCount ?? 0} file{(s.fileCount ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenInspect(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded border border-slate-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preview Code</span>
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => setSnapshotToRestore(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Take Snapshot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Capture Codebase Snapshot</h3>
            <p className="text-xs text-slate-400 mb-4">
              Freezes current state of all files in this workspace as a permanent version
            </p>

            {errorMsg && <p className="text-xs text-rose-400 mb-3">{errorMsg}</p>}

            <form onSubmit={handleTakeSnapshot} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Snapshot Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. v1.2.0 - Stable Tokenizer Release"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What changed in this milestone..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving Snapshot...' : 'Save Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snapshot Preview / Inspect Modal */}
      {inspectingSnapshot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="h-12 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-indigo-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100">{inspectingSnapshot.title}</h3>
                  <p className="text-[11px] text-slate-400">
                    Created by {inspectingSnapshot.creator?.name} on{' '}
                    {new Date(inspectingSnapshot.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    onClick={() => setSnapshotToRestore(inspectingSnapshot)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Restore this Version</span>
                  </button>
                )}
                <button
                  onClick={() => setInspectingSnapshot(null)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Left file list, Right code preview */}
            <div className="flex-1 flex overflow-hidden">
              <div className="w-60 border-r border-slate-800 bg-slate-950/80 overflow-y-auto p-2">
                <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Captured Files ({inspectingSnapshot.files?.length || 0})
                </p>
                <div className="space-y-0.5 mt-1">
                  {inspectingSnapshot.files?.map((f: any) => (
                    <button
                      key={f.path}
                      onClick={() => setSelectedPreviewFile(f)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center gap-2 truncate transition-colors ${
                        selectedPreviewFile?.path === f.path
                          ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{f.path}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-[#090d16] overflow-hidden">
                {selectedPreviewFile ? (
                  <>
                    <div className="h-8 px-4 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>{selectedPreviewFile.path}</span>
                      <span className="capitalize">{selectedPreviewFile.language}</span>
                    </div>
                    <pre className="flex-1 p-4 font-mono text-xs text-slate-200 overflow-auto whitespace-pre leading-relaxed">
                      <code>{selectedPreviewFile.content}</code>
                    </pre>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                    <p>Select a file to preview its snapshot content.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {snapshotToRestore && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-md shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-100">Restore Codebase Snapshot?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will update all files in the current workspace to match the snapshot{' '}
              <span className="font-semibold text-amber-300">"{snapshotToRestore.title}"</span>.
            </p>

            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
              Note: A new restoration snapshot will automatically be recorded in your history so that no previous work is ever lost.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSnapshotToRestore(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded disabled:opacity-50 transition-colors"
              >
                {isRestoring ? 'Restoring Workspace...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
