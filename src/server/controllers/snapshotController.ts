import { Request, Response } from 'express';
import { prisma } from '../db.js';

export async function createSnapshot(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;
    const { title, description } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Snapshot title is required.' });
      return;
    }

    // Capture all current project files
    const files = await prisma.projectFile.findMany({
      where: { projectId },
      select: {
        name: true,
        path: true,
        content: true,
        language: true,
      },
    });

    if (files.length === 0) {
      res.status(400).json({ error: 'Cannot create a snapshot of a project with no files.' });
      return;
    }

    const snapshot = await prisma.snapshot.create({
      data: {
        projectId,
        creatorId: userId,
        title: title.trim(),
        description: description?.trim() || null,
        filesJson: JSON.stringify(files),
        isRestored: false,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({
      snapshot: {
        ...snapshot,
        fileCount: files.length,
      },
      message: 'Workspace snapshot captured successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create snapshot.', details: err?.message });
  }
}

export async function listSnapshots(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;

    const snapshots = await prisma.snapshot.findMany({
      where: { projectId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = snapshots.map((s) => {
      let fileCount = 0;
      try {
        const parsed = JSON.parse(s.filesJson);
        fileCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        fileCount = 0;
      }
      return {
        id: s.id,
        projectId: s.projectId,
        title: s.title,
        description: s.description,
        creator: s.creator,
        isRestored: s.isRestored,
        fileCount,
        createdAt: s.createdAt,
      };
    });

    res.json({ snapshots: formatted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list snapshots.', details: err?.message });
  }
}

export async function getSnapshot(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, snapshotId } = req.params;

    const snapshot = await prisma.snapshot.findFirst({
      where: { id: snapshotId, projectId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!snapshot) {
      res.status(404).json({ error: 'Snapshot not found.' });
      return;
    }

    let parsedFiles = [];
    try {
      parsedFiles = JSON.parse(snapshot.filesJson);
    } catch {
      parsedFiles = [];
    }

    res.json({
      snapshot: {
        ...snapshot,
        files: parsedFiles,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve snapshot.', details: err?.message });
  }
}

export async function restoreSnapshot(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, snapshotId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const targetSnapshot = await prisma.snapshot.findFirst({
      where: { id: snapshotId, projectId },
    });

    if (!targetSnapshot) {
      res.status(404).json({ error: 'Snapshot to restore was not found.' });
      return;
    }

    let filesToRestore: Array<{ name: string; path: string; content: string; language: string }> = [];
    try {
      filesToRestore = JSON.parse(targetSnapshot.filesJson);
    } catch {
      res.status(400).json({ error: 'Corrupt snapshot payload; unable to parse files.' });
      return;
    }

    if (!Array.isArray(filesToRestore) || filesToRestore.length === 0) {
      res.status(400).json({ error: 'Snapshot contains no restorable files.' });
      return;
    }

    // Apply files within a database transaction:
    // Delete existing project files and recreate with the snapshot's state
    await prisma.$transaction(async (tx) => {
      await tx.projectFile.deleteMany({
        where: { projectId },
      });

      for (const f of filesToRestore) {
        await tx.projectFile.create({
          data: {
            projectId,
            name: f.name,
            path: f.path,
            content: f.content,
            language: f.language || 'javascript',
          },
        });
      }

      // Record restoration as a NEW snapshot without overwriting history
      await tx.snapshot.create({
        data: {
          projectId,
          creatorId: userId,
          title: `Restored: ${targetSnapshot.title}`,
          description: `Snapshot reverted from "${targetSnapshot.title}" (Original created: ${new Date(
            targetSnapshot.createdAt
          ).toLocaleString()}).`,
          filesJson: targetSnapshot.filesJson,
          isRestored: true,
        },
      });
    });

    // Return the fresh project files
    const updatedFiles = await prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
    });

    res.json({
      message: `Successfully restored workspace from snapshot "${targetSnapshot.title}". New restoration snapshot recorded in history.`,
      files: updatedFiles,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restore snapshot.', details: err?.message });
  }
}
