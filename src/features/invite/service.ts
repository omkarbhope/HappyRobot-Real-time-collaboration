import { nanoid } from "nanoid";
import { db } from "@/core/db/client";
import { INVITE_CODE_LENGTH } from "@/shared/constants";
import type { CreateInviteCodeInput, JoinByCodeInput } from "@/features/invite/types";

export async function createCode(projectId: string, userId: string) {
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member || member.role !== "owner") return null;
  const code = nanoid(INVITE_CODE_LENGTH).toUpperCase().replace(/[-_]/g, "0");
  const created = await db.inviteCode.create({
    data: { projectId, code, createdById: userId },
  });
  return created;
}

export async function joinByCode(code: string, userId: string) {
  const invite = await db.inviteCode.findUnique({
    where: { code: code.toUpperCase().trim() },
    include: { project: true },
  });
  if (!invite) return null;
  if (invite.expiresAt && invite.expiresAt < new Date()) return null;
  const existing = await db.projectMember.findFirst({
    where: { projectId: invite.projectId, userId },
  });
  if (existing) return { project: invite.project, alreadyMember: true };
  await db.projectMember.create({
    data: { projectId: invite.projectId, userId, role: "member" },
  });
  return { project: invite.project, alreadyMember: false };
}
