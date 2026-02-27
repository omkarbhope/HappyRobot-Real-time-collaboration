import { db } from "@/core/db/client";
import { Prisma } from "@prisma/client";
import { appendEvent } from "@/core/events";
import { publish } from "@/core/realtime";
import { boardCache } from "@/core/cache";
import { BOARD_EVENT_TYPES } from "@/shared/constants/events";
import type { CreateProjectInput, UpdateProjectInput } from "@/features/projects/types";

export async function create(userId: string, input: CreateProjectInput) {
  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        metadata: (input.metadata == null ? Prisma.JsonNull : input.metadata) as Prisma.InputJsonValue,
        ownerId: userId,
      },
    });
    await tx.projectMember.create({
      data: {
        projectId: created.id,
        userId,
        role: "owner",
      },
    });
    await appendEvent(tx, {
      boardId: created.id,
      type: BOARD_EVENT_TYPES.PROJECT_CREATED,
      payload: { projectId: created.id, name: created.name },
      userId,
    });
    return created;
  });
  publish(project.id, { type: BOARD_EVENT_TYPES.PROJECT_CREATED, projectId: project.id, project });
  return project;
}

export async function getById(projectId: string, userId: string) {
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
    include: { project: true },
  });
  if (!member) return null;
  return member.project;
}

export async function listByUser(userId: string) {
  const members = await db.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = members.map((m) => m.projectId);
  if (projectIds.length === 0) return [];
  return db.project.findMany({
    where: { id: { in: projectIds } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function update(projectId: string, userId: string, input: UpdateProjectInput) {
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member) return null;
  const updated = await db.$transaction(async (tx) => {
    const prev = await tx.project.findUnique({ where: { id: projectId } });
    if (!prev) return null;
    const u = await tx.project.update({
      where: { id: projectId },
      data: {
        ...(input.name != null && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.metadata !== undefined && { metadata: (input.metadata === null ? Prisma.JsonNull : input.metadata) as Prisma.InputJsonValue }),
      },
    });
    await appendEvent(tx, {
      boardId: projectId,
      type: BOARD_EVENT_TYPES.PROJECT_UPDATED,
      payload: { projectId, patch: input, previous: { name: prev.name } },
      userId,
    });
    return u;
  });
  if (updated) {
    boardCache.invalidate(projectId);
    publish(projectId, { type: BOARD_EVENT_TYPES.PROJECT_UPDATED, projectId, project: updated });
  }
  return updated;
}

export async function remove(projectId: string, userId: string) {
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member || member.role !== "owner") return false;
  await db.project.delete({ where: { id: projectId } });
  boardCache.invalidate(projectId);
  publish(projectId, { type: BOARD_EVENT_TYPES.PROJECT_DELETED, projectId });
  return true;
}
/** Check if user is a member of the project. */
export async function isMember(projectId: string, userId: string): Promise<boolean> {
  const m = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  return !!m;
}

export type ProjectMemberUser = {
  id: string;
  name: string | null;
  image: string | null;
};

export async function listMembers(projectId: string, userId: string): Promise<ProjectMemberUser[]> {
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member) return [];
  const members = await db.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    image: m.user.image,
  }));
}
