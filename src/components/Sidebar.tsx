import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  Code,
  KanbanSquare,
  History,
  Users,
  Settings,
  HelpCircle,
  FileCode,
} from 'lucide-react';

interface SidebarProps {
  onOpenDocs?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenDocs }) => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) return null;

  const navItems = [
    {
      to: `/project/${projectId}/workspace`,
      label: 'Workspace',
      icon: Code,
    },
    {
      to: `/project/${projectId}/kanban`,
      label: 'Kanban Tasks',
      icon: KanbanSquare,
    },
    {
      to: `/project/${projectId}/snapshots`,
      label: 'Snapshots',
      icon: History,
    },
    {
      to: `/project/${projectId}/team`,
      label: 'Team Members',
      icon: Users,
    },
  ];

  return (
    <aside className="w-12 bg-slate-950 border-r border-slate-800 flex flex-col items-center justify-between py-3 select-none z-20 shrink-0">
      <div className="flex flex-col items-center gap-1.5 w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `w-9 h-9 rounded flex items-center justify-center transition-colors relative group ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span className="sr-only">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1.5 w-full">
        {onOpenDocs && (
          <button
            onClick={onOpenDocs}
            title="Architecture & Documentation"
            className="w-9 h-9 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) =>
            `w-9 h-9 rounded flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`
          }
        >
          <Settings className="w-4 h-4" />
        </NavLink>
      </div>
    </aside>
  );
};
