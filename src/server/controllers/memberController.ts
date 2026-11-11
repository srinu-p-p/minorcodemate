import { Request, Response } from 'express';
import { prisma } from '../db.js';

export async function listMembers(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ members });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list project members.', details: err?.message });
  }
}

export async function addMember(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userToAdd = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!userToAdd) {
      res.status(404).json({
        error: `User with email "${normalizedEmail}" was not found. Please ask them to register first or add an existing demo user (e.g. sarah@codesync.dev or marcus@codesync.dev).`,
      });
      return;
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      res.status(409).json({ error: 'User is already a member of this project.' });
      return;
    }

    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId: userToAdd.id,
        role: role === 'viewer' ? 'viewer' : 'editor',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json({
      member: newMember,
      message: `Added ${userToAdd.name} (${userToAdd.email}) as ${newMember.role}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add project member.', details: err?.message });
  }
}

export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, memberId } = req.params;
    const { role } = req.body;

    if (!['editor', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'Role must be either "editor" or "viewer".' });
      return;
    }

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    res.json({ member: updated, message: `Updated role to ${role}.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update member role.', details: err?.message });
  }
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, memberId } = req.params;
    const currentUserId = req.user?.id;

    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { project: true },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }

    const isOwner = member.project.ownerId === currentUserId;
    const isSelf = member.userId === currentUserId;

    if (!isOwner && !isSelf) {
      res.status(403).json({ error: 'You do not have permission to remove this member.' });
      return;
    }

    // Owner cannot be removed
    if (member.userId === member.project.ownerId) {
      res.status(400).json({ error: 'Project owner cannot be removed from project.' });
      return;
    }

    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    res.json({ message: 'Member removed from project.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove project member.', details: err?.message });
  }
}
