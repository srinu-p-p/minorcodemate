import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ProjectProvider } from './context/ProjectContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { ProjectKanbanPage } from './pages/ProjectKanbanPage.js';
import { ProjectSnapshotsPage } from './pages/ProjectSnapshotsPage.js';
import { ProjectTeamPage } from './pages/ProjectTeamPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-500">
        Loading CodeSync session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/project/:projectId/workspace"
              element={
                <ProtectedRoute>
                  <WorkspacePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/project/:projectId/kanban"
              element={
                <ProtectedRoute>
                  <ProjectKanbanPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/project/:projectId/snapshots"
              element={
                <ProtectedRoute>
                  <ProjectSnapshotsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/project/:projectId/team"
              element={
                <ProtectedRoute>
                  <ProjectTeamPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
