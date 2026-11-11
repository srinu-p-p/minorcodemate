export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  createdAt?: string;
  _count?: {
    projects: number;
    memberships: number;
    tasks: number;
    snapshots: number;
  };
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
    avatarUrl?: string;
  };
}

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  content: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  order: number;
  assigneeId?: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Snapshot {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  fileCount?: number;
  files?: Array<{
    name: string;
    path: string;
    content: string;
    language: string;
  }>;
  creatorId: string;
  isRestored: boolean;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: ProjectMember[];
  files?: ProjectFile[];
  tasks?: Task[];
  snapshots?: Snapshot[];
  _count?: {
    files: number;
    tasks: number;
    snapshots: number;
    members: number;
  };
}

export interface ConnectedCollaborator {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  projectId: string;
  activeFileId?: string;
  activeFilePath?: string;
  color: string;
}

export interface CodeReviewIssue {
  id: string;
  type: 'syntax' | 'logic' | 'runtime' | 'security' | 'readability';
  severity: 'critical' | 'warning' | 'suggestion';
  line?: number;
  title: string;
  description: string;
  suggestion: string;
  fixedCodeSnippet?: string;
}

export interface CodeReviewResult {
  provider: string;
  model: string;
  summary: string;
  assessment: 'clean' | 'needs_minor_fixes' | 'critical_issues_found';
  issues: CodeReviewIssue[];
  strengths: string[];
  recommendations: string[];
  timestamp: string;
}

export interface CodeExplanationResult {
  provider: string;
  model: string;
  title: string;
  summary: string;
  breakdown: Array<{
    component: string;
    purpose: string;
    details: string;
  }>;
  executionFlow: string;
  keyConcepts: Array<{
    concept: string;
    explanation: string;
  }>;
  beginnerTip: string;
  timestamp: string;
}
