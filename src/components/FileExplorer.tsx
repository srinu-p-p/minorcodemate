import React, { useState } from 'react';
import {
  FilePlus,
  Trash2,
  FileCode,
  FileText,
  FileJson,
  Code,
  FolderTree,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext.js';
import { ProjectFile } from '../types/index.js';

export const FileExplorer: React.FC = () => {
  const { files, activeFile, selectFile, createFile, deleteFile, userRole } = useProject();
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canEdit = userRole === 'owner' || userRole === 'editor';

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (fileName.endsWith('.py')) {
      return <Code className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (fileName.endsWith('.json')) {
      return <FileJson className="w-3.5 h-3.5 text-yellow-300 shrink-0" />;
    }
    if (fileName.endsWith('.md')) {
      return <FileText className="w-3.5 h-3.5 text-sky-300 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await createFile(newFilePath.trim());
      setNewFilePath('');
      setShowNewFileModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to create file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteFile(fileToDelete.id);
      setFileToDelete(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to delete file');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-56 bg-slate-900/90 border-r border-slate-800 flex flex-col h-full select-none shrink-0 text-xs">
      {/* Explorer Header */}
      <div className="h-9 px-3 border-b border-slate-800 flex items-center justify-between font-semibold text-slate-400 tracking-wider uppercase text-[11px]">
        <div className="flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5 text-slate-400" />
          <span>Explorer</span>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setErrorMsg('');
              setShowNewFileModal(true);
            }}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Create New File"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-2">
        {files.length === 0 ? (
          <div className="px-3 py-6 text-center text-slate-500">
            <p>No files in workspace.</p>
          </div>
        ) : (
          <ul className="space-y-0.5 px-1.5">
            {files.map((file) => {
              const isActive = activeFile?.id === file.id;
              return (
                <li
                  key={file.id}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-200 font-medium border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                  onClick={() => selectFile(file.id)}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    {getFileIcon(file.name)}
                    <span className="truncate">{file.path}</span>
                  </div>

                  {canEdit && files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileToDelete(file);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 transition-opacity"
                      title="Delete file"
                    >
                      <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-400" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Create New File</h3>
            <p className="text-xs text-slate-400 mb-3">
              Enter relative path (e.g. <span className="font-mono text-indigo-400">src/utils.js</span> or{' '}
              <span className="font-mono text-indigo-400">types.ts</span>)
            </p>

            {errorMsg && <p className="text-xs text-rose-400 mb-2">{errorMsg}</p>}

            <form onSubmit={handleCreateFile}>
              <input
                type="text"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="src/filename.ts"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 mb-4 font-mono"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFileModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newFilePath.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Delete File</h3>
            <p className="text-xs text-slate-300 mb-4">
              Are you sure you want to delete <span className="font-mono text-rose-400">{fileToDelete.path}</span>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFile}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
