import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Project,
  ProjectFile,
  Task,
  Snapshot,
  ProjectMember,
  ConnectedCollaborator,
} from '../types/index.js';
import { projectsApi, filesApi, tasksApi, snapshotsApi, membersApi } from '../services/api.js';
import {
  getSocket,
  joinProjectRoom,
  notifyFileFocus,
  broadcastSnapshotCreated,
} from '../services/socket.js';
import { useAuth } from './AuthContext.js';

interface ProjectContextType {
  project: Project | null;
  userRole: 'owner' | 'editor' | 'viewer';
  files: ProjectFile[];
  activeFile: ProjectFile | null;
  tasks: Task[];
  snapshots: Snapshot[];
  members: ProjectMember[];
  collaborators: ConnectedCollaborator[];
  isLoading: boolean;
  error: string | null;
  loadProject: (projectId: string) => Promise<void>;
  selectFile: (fileId: string) => void;
  saveActiveFile: (newContent?: string) => Promise<void>;
  createFile: (path: string, content?: string, language?: string) => Promise<ProjectFile>;
  deleteFile: (fileId: string) => Promise<void>;
  updateFileContentLocally: (content: string) => void;
  refreshFiles: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshSnapshots: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  takeSnapshot: (title: string, description?: string) => Promise<Snapshot>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [collaborators, setCollaborators] = useState<ConnectedCollaborator[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(
    async (projectId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await projectsApi.get(projectId);
        setProject(data.project);
        setUserRole(data.userRole);

        const projectFiles = data.project.files || [];
        setFiles(projectFiles);

        // Select initial file (e.g. index.js / index.ts or first file)
        if (projectFiles.length > 0) {
          const defaultFile =
            projectFiles.find((f) => f.name.startsWith('index.') || f.name.startsWith('main.')) ||
            projectFiles[0];
          setActiveFile(defaultFile);
          joinProjectRoom(projectId, defaultFile.id, defaultFile.path);
        } else {
          setActiveFile(null);
          joinProjectRoom(projectId);
        }

        setTasks(data.project.tasks || []);
        setSnapshots(data.project.snapshots || []);
        setMembers(data.project.members || []);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Setup real-time Socket.IO listeners when project is active
  useEffect(() => {
    if (!project || !token) return;

    const socket = getSocket(token);

    const handlePresenceList = (activeUsers: ConnectedCollaborator[]) => {
      setCollaborators(activeUsers);
    };

    const handleTaskSync = ({ action, task }: { action: string; task: Task }) => {
      if (action === 'create') {
        setTasks((prev) => {
          if (prev.some((t) => t.id === task.id)) return prev;
          return [task, ...prev];
        });
      } else if (action === 'update') {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      } else if (action === 'delete') {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      }
    };

    const handleSnapshotNotification = ({ snapshot }: { snapshot: Snapshot }) => {
      setSnapshots((prev) => {
        if (prev.some((s) => s.id === snapshot.id)) return prev;
        return [snapshot, ...prev];
      });
    };

    socket.on('presence:list', handlePresenceList);
    socket.on('task:sync', handleTaskSync);
    socket.on('snapshot:notification', handleSnapshotNotification);

    return () => {
      socket.off('presence:list', handlePresenceList);
      socket.off('task:sync', handleTaskSync);
      socket.off('snapshot:notification', handleSnapshotNotification);
    };
  }, [project, token]);

  const selectFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      setActiveFile(file);
      if (project) {
        notifyFileFocus(project.id, file.id, file.path);
      }
    }
  };

  const updateFileContentLocally = (content: string) => {
    if (!activeFile) return;
    setActiveFile((prev) => (prev ? { ...prev, content } : null));
    setFiles((prev) => prev.map((f) => (f.id === activeFile.id ? { ...f, content } : f)));
  };

  const saveActiveFile = async (newContent?: string) => {
    if (!project || !activeFile) return;
    const contentToSave = newContent !== undefined ? newContent : activeFile.content;
    const updated = await filesApi.update(project.id, activeFile.id, {
      content: contentToSave,
    });
    setActiveFile(updated);
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };

  const createFile = async (path: string, content?: string, language?: string) => {
    if (!project) throw new Error('No active project');
    const newFile = await filesApi.create(project.id, { path, content, language });
    setFiles((prev) => [...prev, newFile].sort((a, b) => a.path.localeCompare(b.path)));
    setActiveFile(newFile);
    notifyFileFocus(project.id, newFile.id, newFile.path);
    return newFile;
  };

  const deleteFile = async (fileId: string) => {
    if (!project) throw new Error('No active project');
    await filesApi.delete(project.id, fileId);
    setFiles((prev) => {
      const remaining = prev.filter((f) => f.id !== fileId);
      if (activeFile?.id === fileId) {
        setActiveFile(remaining[0] || null);
      }
      return remaining;
    });
  };

  const refreshFiles = async () => {
    if (!project) return;
    const fileList = await filesApi.list(project.id);
    setFiles(fileList);
    if (activeFile) {
      const current = fileList.find((f) => f.id === activeFile.id);
      if (current) setActiveFile(current);
    }
  };

  const refreshTasks = async () => {
    if (!project) return;
    const taskList = await tasksApi.list(project.id);
    setTasks(taskList);
  };

  const refreshSnapshots = async () => {
    if (!project) return;
    const snapshotList = await snapshotsApi.list(project.id);
    setSnapshots(snapshotList);
  };

  const refreshMembers = async () => {
    if (!project) return;
    const memberList = await membersApi.list(project.id);
    setMembers(memberList);
  };

  const takeSnapshot = async (title: string, description?: string) => {
    if (!project) throw new Error('No active project');
    const newSnapshot = await snapshotsApi.create(project.id, { title, description });
    setSnapshots((prev) => [newSnapshot, ...prev]);
    broadcastSnapshotCreated(project.id, newSnapshot);
    return newSnapshot;
  };

  const restoreSnapshot = async (snapshotId: string) => {
    if (!project) throw new Error('No active project');
    const res = await snapshotsApi.restore(project.id, snapshotId);
    setFiles(res.files);
    if (res.files.length > 0) {
      setActiveFile(res.files[0]);
    }
    await refreshSnapshots();
  };

  return (
    <ProjectContext.Provider
      value={{
        project,
        userRole,
        files,
        activeFile,
        tasks,
        snapshots,
        members,
        collaborators,
        isLoading,
        error,
        loadProject,
        selectFile,
        saveActiveFile,
        createFile,
        deleteFile,
        updateFileContentLocally,
        refreshFiles,
        refreshTasks,
        refreshSnapshots,
        refreshMembers,
        takeSnapshot,
        restoreSnapshot,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
