import { Request, Response } from 'express';
import { prisma } from '../db.js';

export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { name, description, template } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Project name is required.' });
      return;
    }

    // Default starter files based on template
    let defaultFiles = [
      {
        name: 'index.js',
        path: 'index.js',
        language: 'javascript',
        content: `/**
 * CodeSync Collaborative Workspace
 * Project: ${name.trim()}
 */

function main() {
  console.log("Welcome to ${name.trim()} on CodeSync!");
  
  // Real-time collaborative workspace initialized
  const status = {
    collaborativeSync: "active",
    aiAssisted: true,
    version: "1.0.0"
  };
  
  return status;
}

main();
`,
      },
      {
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${name.trim()}

${description || 'Collaborative software engineering workspace on CodeSync.'}

## Features
- Real-time collaborative editing with Monaco Editor & Yjs
- AI-driven code reviews and beginner-friendly explanations
- Kanban workflow management
- Persistent code snapshots
`,
      },
    ];

    if (template === 'typescript') {
      defaultFiles = [
        {
          name: 'index.ts',
          path: 'src/index.ts',
          language: 'typescript',
          content: `export interface WorkspaceConfig {
  projectName: string;
  maxCollaborators: number;
  features: string[];
}

export function initializeWorkspace(config: WorkspaceConfig): string {
  console.log(\`Starting \${config.projectName}...\`);
  return \`Workspace \${config.projectName} ready with \${config.features.length} modules.\`;
}

initializeWorkspace({
  projectName: "${name.trim()}",
  maxCollaborators: 10,
  features: ["Monaco Editor", "Yjs Sync", "AI Review", "Kanban", "Snapshots"]
});
`,
        },
        {
          name: 'README.md',
          path: 'README.md',
          language: 'markdown',
          content: `# ${name.trim()}\n\n${description || 'TypeScript collaborative engineering project.'}`,
        },
      ];
    } else if (template === 'python') {
      defaultFiles = [
        {
          name: 'main.py',
          path: 'main.py',
          language: 'python',
          content: `"""
${name.trim()} - CodeSync Python Workspace
"""

def process_data(items: list) -> dict:
    results = {"total": len(items), "processed": 0}
    for item in items:
        # process item logic
        results["processed"] += 1
    return results

if __name__ == "__main__":
    print("Welcome to ${name.trim()} on CodeSync")
    stats = process_data([1, 2, 3, 4, 5])
    print(f"Executed data pipeline: {stats}")
`,
        },
      ];
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
        files: {
          create: defaultFiles,
        },
        tasks: {
          create: [
            {
              title: 'Review Project Architecture',
              description: 'Examine initial files, dependencies, and collaborative conventions.',
              status: 'todo',
              priority: 'high',
              order: 0,
              creatorId: userId,
              assigneeId: userId,
            },
            {
              title: 'Implement Core Module Features',
              description: 'Develop main functionality using real-time collaborative editor.',
              status: 'in_progress',
              priority: 'urgent',
              order: 1,
              creatorId: userId,
              assigneeId: userId,
            },
            {
              title: 'Run AI Code Review',
              description: 'Verify syntax, security risks, and optimization suggestions using AI assistant.',
              status: 'todo',
              priority: 'medium',
              order: 2,
              creatorId: userId,
            },
          ],
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        files: true,
      },
    });

    res.status(201).json({ project, message: 'Project created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create project.', details: err?.message });
  }
}

export async function listProjects(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        _count: {
          select: {
            files: true,
            tasks: true,
            snapshots: true,
            members: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list projects.', details: err?.message });
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        files: {
          orderBy: { path: 'asc' },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            creator: { select: { id: true, name: true, email: true } },
          },
          orderBy: { order: 'asc' },
        },
        snapshots: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    // Check access
    const isOwner = project.ownerId === userId;
    const membership = project.members.find((m) => m.userId === userId);
    if (!isOwner && !membership) {
      res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
      return;
    }

    const currentRole = isOwner ? 'owner' : membership?.role || 'viewer';

    res.json({ project, userRole: currentRole });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve project.', details: err?.message });
  }
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
      },
    });

    res.json({ project: updated, message: 'Project updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update project.', details: err?.message });
  }
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    if (project.ownerId !== userId) {
      res.status(403).json({ error: 'Only the project owner can delete this project.' });
      return;
    }

    await prisma.project.delete({
      where: { id },
    });

    res.json({ message: 'Project deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete project.', details: err?.message });
  }
}
