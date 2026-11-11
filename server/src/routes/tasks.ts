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
    position: z.number().int().min(0).optional(), // move: index AFTER the move
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

    // Append after the highest position (a plain count breaks once a column
    // has gaps left by deletions or moves).
    const agg = await prisma.task.aggregate({
      where: { projectId, status: data.status },
      _max: { position: true },
    });
    const task = await prisma.task.create({
      data: {
        ...data,
        projectId,
        position: (agg._max.position ?? -1) + 1,
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
// With `position`, the task MOVES: `position` is its index in the target
// column after the move. The transaction reads both affected columns in
// display order, removes the task, re-inserts it at `position` and renumbers
// — so ordering stays correct even when columns have gaps (deletes), and the
// board sends exactly one request per drop.
router.patch('/tasks/:id', requireAuth, validateBody(updateTaskSchema), async (req, res, next) => {
  try {
    const current = await requireTaskAccess(param(req, 'id'), req.user!.id);
    const data = req.body as z.infer<typeof updateTaskSchema>;
    const { position, ...fields } = data;

    if (position === undefined) {
      const task = await prisma.task.update({ where: { id: current.id }, data: fields });
      return res.json({ task });
    }

    const targetStatus = fields.status ?? current.status;
    const task = await prisma.$transaction(
      async (tx) => {
        const readColumn = (status: string) =>
          tx.task.findMany({
            where: { projectId: current.projectId, status },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
            select: { id: true, position: true },
          });

        const sourceColumn = await readColumn(current.status);
        const targetColumn = targetStatus === current.status ? sourceColumn : await readColumn(targetStatus);

        // Desired target order: task removed, re-inserted at the requested index.
        const targetOrder = targetColumn.filter((t) => t.id !== current.id).map((t) => t.id);
        const at = Math.max(0, Math.min(position, targetOrder.length));
        targetOrder.splice(at, 0, current.id);

        // Touch only rows that really change: every query is a network round
        // trip to TiDB, so skipping no-ops keeps the transaction short.
        const applyOrder = async (order: string[], before: Array<{ id: string; position: number }>) => {
          const prev = new Map(before.map((t) => [t.id, t.position]));
          for (const [index, id] of order.entries()) {
            if (id === current.id) {
              await tx.task.update({ where: { id }, data: { ...fields, status: targetStatus, position: index } });
            } else if (prev.get(id) !== index) {
              await tx.task.update({ where: { id }, data: { position: index } });
            }
          }
        };

        await applyOrder(targetOrder, targetColumn);
        if (targetStatus !== current.status) {
          const sourceOrder = sourceColumn.filter((t) => t.id !== current.id).map((t) => t.id);
          await applyOrder(sourceOrder, sourceColumn);
        }

        const updated = await tx.task.findUnique({ where: { id: current.id } });
        if (!updated) throw new AppError('Task not found', 404, 'NOT_FOUND');
        return updated;
      },
      // TiDB Serverless sleeps between calls; waking it up can take longer
      // than Prisma's default 5s transaction timeout (P2028).
      { maxWait: 10000, timeout: 30000 },
    );
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
