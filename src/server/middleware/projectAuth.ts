import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

export interface ProjectAuthRequest extends Request {
  projectRole?: 'owner' | 'editor' | 'viewer';
}

export function requireProjectAccess(minRole: 'viewer' | 'editor' | 'owner' = 'viewer') {
  return async (req: ProjectAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body?.projectId;
      const userId = req.user?.id;

      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required.' });
        return;
      }

      if (!userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: {
            where: { userId },
          },
        },
      });

      if (!project) {
        res.status(404).json({ error: 'Project not found.' });
        return;
      }

      // Check if user is owner
      if (project.ownerId === userId) {
        req.projectRole = 'owner';
        next();
        return;
      }

      // Check if user is member
      const member = project.members[0];
      if (!member) {
        res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
        return;
      }

      const roleHierarchy: Record<string, number> = {
        viewer: 1,
        editor: 2,
        owner: 3,
      };

      const userRoleLevel = roleHierarchy[member.role] || 0;
      const requiredRoleLevel = roleHierarchy[minRole] || 1;

      if (userRoleLevel < requiredRoleLevel) {
        res.status(403).json({
          error: `Insufficient permissions. This action requires ${minRole} role, but your role is ${member.role}.`,
        });
        return;
      }

      req.projectRole = member.role as 'owner' | 'editor' | 'viewer';
      next();
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to verify project access', details: err?.message });
    }
  };
}
