import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Users,
  FileCode,
  CheckCircle2,
  History,
  ArrowRight,
  Sparkles,
  Server,
  Database,
  Cpu,
  Trash2,
} from 'lucide-react';
import { projectsApi } from '../services/api.js';
import { Project } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { Navbar } from '../components/Navbar.js';
import { ArchitectureModal } from '../components/ArchitectureModal.js';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchDocs, setShowArchDocs] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectTemplate, setProjectTemplate] = useState('javascript');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to list projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const created = await projectsApi.create({
        name: projectName.trim(),
        description: projectDesc.trim() || undefined,
        template: projectTemplate,
      });
      setShowCreateModal(false);
      navigate(`/project/${created.id}/workspace`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalFiles = projects.reduce((acc, p) => acc + (p._count?.files || 0), 0);
  const totalTasks = projects.reduce((acc, p) => acc + (p._count?.tasks || 0), 0);
  const totalSnapshots = projects.reduce((acc, p) => acc + (p._count?.snapshots || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col select-none">
      <Navbar onOpenArchitectureDocs={() => setShowArchDocs(true)} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Hero Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Welcome back, {user?.name || 'Developer'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active role:{' '}
              <span className="text-indigo-400 font-mono">{user?.role || 'Senior Software Engineer'}</span>{' '}
              · Real-time collaborative engineering environment
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchDocs(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            >
              System Overview & Docs
            </button>
            <button
              onClick={() => {
                setProjectName('');
                setProjectDesc('');
                setProjectTemplate('javascript');
                setErrorMsg('');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Workspaces</span>
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-slate-100 font-mono tabular-nums">{projects.length}</p>
            <p className="text-[11px] text-slate-500">Collaborative repositories</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Source Files</span>
              <FileCode className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-bold text-slate-100 font-mono tabular-nums">{totalFiles}</p>
            <p className="text-[11px] text-slate-500">Monaco & Yjs synced</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Kanban Tasks</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-slate-100 font-mono tabular-nums">{totalTasks}</p>
            <p className="text-[11px] text-slate-500">Tracked deliverables</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Snapshots</span>
              <History className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-slate-100 font-mono tabular-nums">{totalSnapshots}</p>
            <p className="text-[11px] text-slate-500">Immutable versions</p>
          </div>
        </div>

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100">Your Engineering Workspaces</h2>
            <span className="text-xs text-slate-400 font-mono">{projects.length} Active</span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-500">
              <p>Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
              <FolderGit2 className="w-12 h-12 text-slate-700 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No Projects Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create your first project workspace to begin collaborative coding with real-time sync and AI reviews.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
              >
                Create Project Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((proj) => {
                const isOwner = proj.ownerId === user?.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => navigate(`/project/${proj.id}/workspace`)}
                    className="p-5 bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer flex flex-col justify-between group space-y-4 shadow-sm hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                          {proj.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                            isOwner
                              ? 'text-amber-300 bg-amber-950/40 border-amber-800/50'
                              : 'text-indigo-300 bg-indigo-950/40 border-indigo-800/50'
                          }`}
                        >
                          {isOwner ? 'Owner' : 'Member'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {proj.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <div className="flex items-center gap-3">
                        <span title="Files">{proj._count?.files || 0} files</span>
                        <span>·</span>
                        <span title="Tasks">{proj._count?.tasks || 0} tasks</span>
                        <span>·</span>
                        <span title="Snapshots">{proj._count?.snapshots || 0} snapshots</span>
                      </div>

                      <div className="flex items-center gap-1 text-indigo-400 text-xs font-sans font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Capabilities Footer Banner */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Full-Stack Dev Server: Port 3000</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>SQLite + Prisma 5.22</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>Ollama qwen2.5:3b (with Gemini Fallback)</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">CodeSync Build 2026</span>
        </div>
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100 mb-1">Create Project Workspace</h3>
            <p className="text-xs text-slate-400 mb-4">
              Set up a collaborative repository with real-time editing and task tracking
            </p>

            {errorMsg && <p className="text-xs text-rose-400 mb-3">{errorMsg}</p>}

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Distributed Consensus Engine"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Workspace objective and technical specifications..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Starter Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'javascript', label: 'JavaScript' },
                    { id: 'typescript', label: 'TypeScript' },
                    { id: 'python', label: 'Python' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setProjectTemplate(tpl.id)}
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        projectTemplate === tpl.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
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
                  disabled={isSubmitting || !projectName.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Creating Workspace...' : 'Create & Open'}
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
