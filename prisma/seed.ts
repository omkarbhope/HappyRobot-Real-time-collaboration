import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "seed@example.com" },
    update: {},
    create: {
      email: "seed@example.com",
      name: "Seed User",
      image: null,
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "Seed Board",
      description: "Dev seed project",
      metadata: null,
      ownerId: user.id,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: user.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: user.id,
      role: "owner",
    },
  });

  const code = nanoid(8).toUpperCase().replace(/[-_]/g, "0");
  const existingCode = await prisma.inviteCode.findFirst({ where: { projectId: project.id } });
  if (!existingCode) {
    await prisma.inviteCode.create({
      data: {
        projectId: project.id,
        code,
        createdById: user.id,
      },
    });
    console.log("Seed done:", { userId: user.id, projectId: project.id, inviteCode: code });
  } else {
    console.log("Seed done:", { userId: user.id, projectId: project.id, inviteCode: existingCode.code });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
