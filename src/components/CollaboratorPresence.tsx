import React from 'react';
import { useProject } from '../context/ProjectContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Users, Wifi, Circle } from 'lucide-react';

export const CollaboratorPresence: React.FC = () => {
  const { collaborators, activeFile } = useProject();
  const { user } = useAuth();

  return (
    <div className="flex items-center gap-2 select-none">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        <span className="font-mono tabular-nums text-slate-300">
          {collaborators.length > 0 ? collaborators.length : 1}
        </span>
        <span className="hidden sm:inline text-slate-400">collaborator{collaborators.length > 1 ? 's' : ''}</span>
      </div>

      {/* Collaborator Avatars */}
      <div className="flex items-center -space-x-1.5 overflow-hidden">
        {collaborators.map((c) => {
          const isCurrentUser = c.userId === user?.id;
          const isSameFile = c.activeFileId === activeFile?.id;
          return (
            <div
              key={c.socketId}
              title={`${c.name} (${c.email})${isCurrentUser ? ' - You' : ''}\nViewing: ${
                c.activeFilePath || 'Workspace'
              }`}
              className="relative group cursor-pointer"
            >
              <div
                style={{
                  backgroundColor: c.color,
                  borderColor: isSameFile ? '#ffffff' : '#1e293b',
                }}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm"
              >
                {c.name ? c.name[0].toUpperCase() : 'U'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
