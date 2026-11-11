import { Request, Response } from 'express';
import { prisma } from '../db.js';

export async function listTasks(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ tasks });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve tasks.', details: err?.message });
  }
}

export async function createTask(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;
    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Task title is required.' });
      return;
    }

    const taskCount = await prisma.task.count({
      where: { projectId, status: status || 'todo' },
    });

    const newTask = await prisma.task.create({
      data: {
        projectId,
        creatorId: userId,
        title: title.trim(),
        description: description?.trim() || null,
        status: status || 'todo',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        order: taskCount,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({ task: newTask, message: 'Task created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create task.', details: err?.message });
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, taskId } = req.params;
    const { title, description, status, priority, dueDate, assigneeId, order } = req.body;

    const existing = await prisma.task.findFirst({
      where: { id: taskId, projectId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(assigneeId !== undefined ? { assigneeId: assigneeId || null } : {}),
        ...(order !== undefined ? { order } : {}),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ task: updated, message: 'Task updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update task.', details: err?.message });
  }
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, taskId } = req.params;

    await prisma.task.delete({
      where: { id: taskId },
    });

    res.json({ message: 'Task deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete task.', details: err?.message });
  }
}
