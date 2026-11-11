import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Mail,
  CheckCircle,
  Crown,
  AlertCircle,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext.js';
import { useAuth } from '../context/AuthContext.js';
import { membersApi } from '../services/api.js';

export const TeamManager: React.FC = () => {
  const { project, members, refreshMembers, userRole } = useProject();
  const { user } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isOwner = userRole === 'owner';

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !email.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await membersApi.add(project.id, {
        email: email.trim(),
        role,
      });
      setSuccessMsg(`Successfully added ${email.trim()} to project.`);
      setEmail('');
      await refreshMembers();
      setTimeout(() => setShowAddModal(false), 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!project || !isOwner) return;
    try {
      await membersApi.updateRole(project.id, memberId, newRole);
      await refreshMembers();
    } catch (err: any) {
      console.error('Failed to update member role:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!project) return;
    if (!window.confirm('Are you sure you want to remove this member from the project?')) return;
    try {
      await membersApi.remove(project.id, memberId);
      await refreshMembers();
    } catch (err: any) {
      console.error('Failed to remove member:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/40">
        <div>
          <h2 className="text-sm font-bold text-slate-100">Team Members & Access Control</h2>
          <p className="text-[11px] text-slate-400">
            Manage collaborators, role-based editing permissions, and project invitations
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => {
              setEmail('');
              setErrorMsg('');
              setSuccessMsg('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Member ({members.length})</span>
            <span>Role / Permissions</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {members.map((member) => {
              const isProjectOwner = project?.ownerId === member.userId;
              const isCurrentSessionUser = user?.id === member.userId;

              return (
                <div
                  key={member.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-slate-900/40 transition-colors"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                      {member.user.name ? member.user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 truncate">
                          {member.user.name}
                        </span>
                        {isProjectOwner && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.5 rounded">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>Owner</span>
                          </span>
                        )}
                        {isCurrentSessionUser && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">{member.user.email}</p>
                    </div>
                  </div>

                  {/* Role Selector & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {isOwner && !isProjectOwner ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 capitalize"
                      >
                        <option value="editor">Editor (Read/Write)</option>
                        <option value="viewer">Viewer (Read Only)</option>
                      </select>
                    ) : (
                      <span className="text-xs font-mono text-slate-400 capitalize px-2 py-1 bg-slate-950 rounded border border-slate-800">
                        {member.role}
                      </span>
                    )}

                    {!isProjectOwner && (isOwner || isCurrentSessionUser) && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title={isCurrentSessionUser ? 'Leave Project' : 'Remove Member'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-800/80 text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-300">Access Roles Explained:</p>
          <ul className="space-y-1 list-disc pl-4 text-[11px] leading-relaxed">
            <li>
              <strong className="text-slate-200">Owner:</strong> Full project governance, rename/delete project, invite & remove members, manage roles, and take/restore snapshots.
            </li>
            <li>
              <strong className="text-slate-200">Editor:</strong> Create, edit, and delete files; run AI code reviews & explanations; create/move tasks; capture snapshots.
            </li>
            <li>
              <strong className="text-slate-200">Viewer:</strong> Read-only access to files, active collaboration presence view, and inspection of snapshots and tasks.
            </li>
          </ul>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Add Team Member</h3>
            <p className="text-xs text-slate-400 mb-3">
              Invite an engineer to collaborate on this workspace in real time
            </p>

            {errorMsg && <p className="text-xs text-rose-400 mb-2">{errorMsg}</p>}
            {successMsg && <p className="text-xs text-emerald-400 mb-2">{successMsg}</p>}

            {/* Quick Demo user buttons */}
            <div className="mb-3 p-2 bg-slate-950 rounded border border-slate-800 text-[11px]">
              <span className="text-slate-400 block mb-1">Quick Select Demo Teammate:</span>
              <div className="flex flex-wrap gap-1.5">
                {['sarah@codesync.dev', 'marcus@codesync.dev', 'alex@codesync.dev'].map((demoEmail) => (
                  <button
                    key={demoEmail}
                    type="button"
                    onClick={() => setEmail(demoEmail)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 transition-colors"
                  >
                    {demoEmail}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@codesync.dev"
                    required
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="editor">Editor (Can edit code, tasks, snapshots)</option>
                  <option value="viewer">Viewer (Read-only observation)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
