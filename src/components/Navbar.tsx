import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Code2,
  FolderGit2,
  Settings,
  LogOut,
  ChevronRight,
  User,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useProject } from '../context/ProjectContext.js';

interface NavbarProps {
  onOpenArchitectureDocs?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenArchitectureDocs }) => {
  const { user, logout } = useAuth();
  const { project, userRole } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isInsideProject = location.pathname.startsWith('/project/');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-8 select-none z-30 shrink-0">
      {/* Zone 1: Single text element wordmark + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to="/"
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors font-semibold tracking-tight whitespace-nowrap shrink-0"
        >
          <Code2 className="w-5 h-5 text-indigo-500" />
          <span className="text-base text-slate-100 font-bold tracking-tight">CodeSync</span>
        </Link>

        {isInsideProject && project && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 min-w-0 truncate">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="text-slate-300 font-medium truncate">{project.name}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 capitalize">{userRole}</span>
          </div>
        )}
      </div>

      {/* Zone 2: 4-5 concise single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <Link
          to="/"
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            location.pathname === '/' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Dashboard
        </Link>
        {isInsideProject && project && (
          <>
            <Link
              to={`/project/${project.id}/workspace`}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.includes('/workspace') ? 'text-indigo-400 font-semibold' : ''
              }`}
            >
              Workspace
            </Link>
            <Link
              to={`/project/${project.id}/kanban`}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.includes('/kanban') ? 'text-indigo-400 font-semibold' : ''
              }`}
            >
              Kanban
            </Link>
            <Link
              to={`/project/${project.id}/snapshots`}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.includes('/snapshots') ? 'text-indigo-400 font-semibold' : ''
              }`}
            >
              Snapshots
            </Link>
            <Link
              to={`/project/${project.id}/team`}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.includes('/team') ? 'text-indigo-400 font-semibold' : ''
              }`}
            >
              Team
            </Link>
          </>
        )}
      </nav>

      {/* Zone 3: 1 primary action / Account menu */}
      <div className="flex items-center gap-3 shrink-0">
        {onOpenArchitectureDocs && (
          <button
            onClick={onOpenArchitectureDocs}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-md border border-slate-700/80 transition-colors whitespace-nowrap"
            title="View System Architecture and Setup Documentation"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Architecture & Docs</span>
          </button>
        )}

        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-md hover:bg-slate-800 text-slate-200 transition-colors border border-transparent hover:border-slate-700"
            >
              <div className="w-6 h-6 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-xs font-bold uppercase">
                {user.name ? user.name[0] : 'U'}
              </div>
              <span className="text-xs font-medium max-w-[100px] truncate hidden sm:inline">
                {user.name}
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="font-semibold text-slate-200 truncate">{user.name}</p>
                  <p className="text-slate-400 truncate text-[11px]">{user.email}</p>
                  <p className="text-indigo-400 mt-1 text-[11px] font-mono">{user.role || 'Developer'}</p>
                </div>
                <Link
                  to="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Workspace Settings & AI</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-950/30 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors shadow-sm"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
