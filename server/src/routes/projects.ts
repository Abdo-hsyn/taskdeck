import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { param } from '../lib/request.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { requireMembership, requireOwner } from '../services/access.js';

const router = Router();
router.use(requireAuth);

const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  description: z.string().trim().max(500).optional(),
});

const updateProjectSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['owner', 'member']).default('member'),
});

// GET /projects — everything the caller owns or is a member of
router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: req.user!.id } } },
      orderBy: { createdAt: 'desc' },
      include: {
        members: { where: { userId: req.user!.id }, select: { role: true } },
        _count: { select: { tasks: true } },
      },
    });

    res.json({
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        role: project.members[0]?.role,
        taskCount: project._count.tasks,
        createdAt: project.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', validateBody(createProjectSchema), async (req, res, next) => {
  try {
    const { name, description } = req.body as z.infer<typeof createProjectSchema>;
    const userId = req.user!.id;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        members: { create: { userId, role: 'owner' } },
      },
      include: { members: true },
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id — full detail: members + ordered tasks
router.get('/:id', async (req, res, next) => {
  try {
    await requireMembership(param(req, 'id'), req.user!.id);

    const project = await prisma.project.findUnique({
      where: { id: param(req, 'id') },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        tasks: { orderBy: [{ status: 'asc' }, { position: 'asc' }] },
      },
    });
    if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');

    res.json({
      project: {
        ...project,
        members: project.members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validateBody(updateProjectSchema), async (req, res, next) => {
  try {
    await requireOwner(param(req, 'id'), req.user!.id);
    const { name, description } = req.body as z.infer<typeof updateProjectSchema>;

    const project = await prisma.project.update({
      where: { id: param(req, 'id') },
      data: { name, description },
    });
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await requireOwner(param(req, 'id'), req.user!.id);
    await prisma.project.delete({ where: { id: param(req, 'id') } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---- members ----

router.get('/:id/members', async (req, res, next) => {
  try {
    await requireMembership(param(req, 'id'), req.user!.id);
    const members = await prisma.projectMember.findMany({
      where: { projectId: param(req, 'id') },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json({
      members: members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', validateBody(addMemberSchema), async (req, res, next) => {
  try {
    const projectId = param(req, 'id');
    await requireOwner(projectId, req.user!.id);
    const { email, role } = req.body as z.infer<typeof addMemberSchema>;

    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) throw new AppError('No account found with that email', 404, 'USER_NOT_FOUND');
    if (invitee.id === req.user!.id) throw new AppError('You are already a member', 409, 'ALREADY_MEMBER');

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: invitee.id } },
      create: { projectId, userId: invitee.id, role },
      update: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({
      member: {
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const projectId = param(req, 'id');
    const owner = await requireOwner(projectId, req.user!.id);
    if (param(req, 'userId') === owner.userId) {
      throw new AppError('The owner cannot leave their own project', 400, 'OWNER_CANNOT_LEAVE');
    }
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: param(req, 'userId') } },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
