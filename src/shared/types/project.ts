export type ProjectRole = "owner" | "member";

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberDto {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: Date;
}
