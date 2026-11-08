import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

/** Idempotent seed: safe to run repeatedly (upserts by email / known ids). */
async function main() {
  const demoPassword = process.env.SEED_PASSWORD ?? 'demo1234!';
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const demo = await prisma.user.upsert({
    where: { email: 'demo@taskdeck.app' },
    create: { name: 'Demo User', email: 'demo@taskdeck.app', passwordHash },
    update: {},
  });

  const teammate = await prisma.user.upsert({
    where: { email: 'sara@taskdeck.app' },
    create: { name: 'Sara Ahmed', email: 'sara@taskdeck.app', passwordHash },
    update: {},
  });

  const existing = await prisma.project.findFirst({ where: { name: 'Website Redesign' } });
  if (existing) {
    console.log('Seed data already present, nothing to do.');
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Marketing site refresh for the Q4 launch.',
      members: {
        create: [
          { userId: demo.id, role: 'owner' },
          { userId: teammate.id, role: 'member' },
        ],
      },
    },
  });

  const seedTasks: Array<{
    title: string;
    description: string;
    status: string;
    priority: string;
    position: number;
    createdById: string;
    comments?: Array<{ body: string; authorId: string }>;
  }> = [
    {
      title: 'Audit current pages',
      description: 'List every live URL and note what to keep or drop.',
      status: 'done',
      priority: 'medium',
      position: 0,
      createdById: demo.id,
    },
    {
      title: 'Design new landing hero',
      description: 'Three directions, one gets picked on Thursday.',
      status: 'doing',
      priority: 'high',
      position: 0,
      createdById: demo.id,
      comments: [
        { body: 'Direction B feels closest to the brand.', authorId: teammate.id },
        { body: 'Agreed — I will polish B tonight.', authorId: demo.id },
      ],
    },
    {
      title: 'Write migration plan',
      description: 'Redirect map for old blog posts.',
      status: 'doing',
      priority: 'low',
      position: 1,
      createdById: teammate.id,
    },
    {
      title: 'Set up analytics events',
      description: 'Page views, CTA clicks, form submits.',
      status: 'todo',
      priority: 'medium',
      position: 0,
      createdById: demo.id,
    },
    {
      title: 'Accessibility review',
      description: 'Keyboard pass + contrast check on the new templates.',
      status: 'todo',
      priority: 'high',
      position: 1,
      createdById: demo.id,
    },
  ];

  for (const task of seedTasks) {
    const { comments, ...data } = task;
    const created = await prisma.task.create({
      data: { ...data, projectId: project.id },
    });
    if (comments) {
      await prisma.comment.createMany({
        data: comments.map((c) => ({ ...c, taskId: created.id })),
      });
    }
  }

  console.log(`Seeded demo project "${project.name}" with ${seedTasks.length} tasks.`);
  console.log(`Login: demo@taskdeck.app / ${demoPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
