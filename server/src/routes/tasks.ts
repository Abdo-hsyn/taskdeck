import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { param } from '../lib/request.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { requireMembership, requireOwner, requireTaskAccess } from '../services/access.js';

const router = Router();

const statusEnum = z.enum(['todo', 'doing', 'done']);
const priorityEnum = z.enum(['low', 'medium', 'high']);

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  status: statusEnum.default('todo'),
  priority: priorityEnum.default('medium'),
  dueDate: z.coerce.date().nullable().optional(),
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    dueDate: z.coerce.date().nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
});

// GET /projects/:id/tasks?status=
router.get('/projects/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    await requireMembership(param(req, 'id'), req.user!.id);
    const status = req.query.status ? statusEnum.parse(req.query.status) : undefined;

    const tasks = await prisma.task.findMany({
      where: { projectId: param(req, 'id'), ...(status ? { status } : {}) },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

// POST /projects/:id/tasks
router.post('/projects/:id/tasks', requireAuth, validateBody(createTaskSchema), async (req, res, next) => {
  try {
    const projectId = param(req, 'id');
    await requireMembership(projectId, req.user!.id);
    const data = req.body as z.infer<typeof createTaskSchema>;

    const count = await prisma.task.count({ where: { projectId, status: data.status } });
    const task = await prisma.task.create({
      data: {
        ...data,
        projectId,
        position: count,
        createdById: req.user!.id,
      },
    });
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

// GET /tasks/:id — with comments
router.get('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    await requireTaskAccess(param(req, 'id'), req.user!.id);

    const task = await prisma.task.findUnique({
      where: { id: param(req, 'id') },
      include: {
        project: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    res.json({
      task: {
        ...task,
        comments: task.comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt,
          authorId: c.authorId,
          authorName: c.author.name,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /tasks/:id
router.patch('/tasks/:id', requireAuth, validateBody(updateTaskSchema), async (req, res, next) => {
  try {
    await requireTaskAccess(param(req, 'id'), req.user!.id);
    const data = req.body as z.infer<typeof updateTaskSchema>;
    const task = await prisma.task.update({ where: { id: param(req, 'id') }, data });
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

// DELETE /tasks/:id — project owner or the task creator
router.delete('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const task = await requireTaskAccess(param(req, 'id'), req.user!.id);
    const userId = req.user!.id;
    const isCreator = task.createdById === userId;
    if (!isCreator) await requireOwner(task.projectId, userId);

    await prisma.task.delete({ where: { id: task.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /tasks/:id/comments
router.post('/tasks/:id/comments', requireAuth, validateBody(commentSchema), async (req, res, next) => {
  try {
    await requireTaskAccess(param(req, 'id'), req.user!.id);
    const { body } = req.body as z.infer<typeof commentSchema>;

    const comment = await prisma.comment.create({
      data: { taskId: param(req, 'id'), authorId: req.user!.id, body },
    });
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

// DELETE /comments/:id — author or project owner
router.delete('/comments/:id', requireAuth, async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: param(req, 'id') } });
    if (!comment) throw new AppError('Comment not found', 404, 'NOT_FOUND');

    const userId = req.user!.id;
    if (comment.authorId !== userId) {
      const task = await prisma.task.findUnique({ where: { id: comment.taskId } });
      if (!task) throw new AppError('Comment not found', 404, 'NOT_FOUND');
      await requireOwner(task.projectId, userId);
    }

    await prisma.comment.delete({ where: { id: comment.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
