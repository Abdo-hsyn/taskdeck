import { prisma } from '../lib/prisma.js';
import { forbidden, notFound } from '../lib/errors.js';

export type Role = 'owner' | 'member';

/** Returns the caller's membership on a project, or throws 404/403. */
export async function requireMembership(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) {
    // Do not leak whether the project exists to non-members.
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!exists) throw notFound('Project not found');
    throw forbidden('You are not a member of this project');
  }
  return membership as { projectId: string; userId: string; role: Role };
}

export async function requireOwner(projectId: string, userId: string) {
  const membership = await requireMembership(projectId, userId);
  if (membership.role !== 'owner') throw forbidden('Only the project owner can do this');
  return membership;
}

/** Loads a task and checks the caller is a member of its project. */
export async function requireTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw notFound('Task not found');
  await requireMembership(task.projectId, userId);
  return task;
}
