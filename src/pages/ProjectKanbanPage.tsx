import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext.js';
import { Navbar } from '../components/Navbar.js';
import { Sidebar } from '../components/Sidebar.js';
import { KanbanBoard } from '../components/KanbanBoard.js';
import { ArchitectureModal } from '../components/ArchitectureModal.js';

export const ProjectKanbanPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { loadProject, project, isLoading } = useProject();
  const [showArchDocs, setShowArchDocs] = useState(false);

  useEffect(() => {
    if (projectId && (!project || project.id !== projectId)) {
      loadProject(projectId);
    }
  }, [projectId, project, loadProject]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden select-none">
      <Navbar onOpenArchitectureDocs={() => setShowArchDocs(true)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenDocs={() => setShowArchDocs(true)} />
        <KanbanBoard />
      </div>
      <ArchitectureModal isOpen={showArchDocs} onClose={() => setShowArchDocs(false)} />
    </div>
  );
};
