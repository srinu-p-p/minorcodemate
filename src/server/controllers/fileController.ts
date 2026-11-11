import { Request, Response } from 'express';
import { prisma } from '../db.js';

export function inferLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'c':
    case 'cpp':
    case 'h':
      return 'cpp';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export async function listFiles(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const files = await prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
    });
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve files.', details: err?.message });
  }
}

export async function getFile(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, fileId } = req.params;
    const file = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId },
    });

    if (!file) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    res.json({ file });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve file.', details: err?.message });
  }
}

export async function createFile(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const { path, name, content, language } = req.body;

    if (!path && !name) {
      res.status(400).json({ error: 'File path or name is required.' });
      return;
    }

    const filePath = (path || name).trim().replace(/^\/+/, '');
    const fileName = filePath.split('/').pop() || filePath;
    const fileLanguage = language || inferLanguage(filePath);

    // Check if file path already exists in project
    const existing = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: filePath,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: `File at "${filePath}" already exists.` });
      return;
    }

    const newFile = await prisma.projectFile.create({
      data: {
        projectId,
        name: fileName,
        path: filePath,
        content: content || '',
        language: fileLanguage,
      },
    });

    res.status(201).json({ file: newFile, message: 'File created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create file.', details: err?.message });
  }
}

export async function updateFile(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, fileId } = req.params;
    const { content, path, name, language } = req.body;

    const existing = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId },
    });

    if (!existing) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    const updated = await prisma.projectFile.update({
      where: { id: fileId },
      data: {
        ...(content !== undefined ? { content } : {}),
        ...(path ? { path: path.trim() } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(language ? { language } : {}),
      },
    });

    res.json({ file: updated, message: 'File saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update file.', details: err?.message });
  }
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, fileId } = req.params;

    // Check count - don't allow deleting the last file
    const fileCount = await prisma.projectFile.count({
      where: { projectId },
    });

    if (fileCount <= 1) {
      res.status(400).json({ error: 'Cannot delete the only file in the workspace.' });
      return;
    }

    await prisma.projectFile.delete({
      where: { id: fileId },
    });

    res.json({ message: 'File deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete file.', details: err?.message });
  }
}
