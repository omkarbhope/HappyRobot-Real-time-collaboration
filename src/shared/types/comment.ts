export interface CommentDto {
  id: string;
  taskId: string;
  content: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}
