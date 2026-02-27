"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/features/auth/use-require-auth";
import { useProjects } from "@/features/projects/use-projects";
import { NewBoardDialog } from "@/features/projects/new-board-dialog";
import { JoinByCodeDialog } from "@/features/projects/join-by-code-dialog";
import { BoardCardPreview } from "@/features/projects/board-card-preview";
import { Button } from "@/components/ui/button";
import { HappyRobotLogo } from "@/components/happy-robot-logo";

export default function DashboardPage() {
  const { isAuthenticated, status } = useRequireAuth();
  const {
    projects,
    loading,
    error,
    fetchProjects,
  } = useProjects();
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);

  if (status === "loading" || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            <HappyRobotLogo size="sm" variant="wordmark" className="h-7" />
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setJoinCodeOpen(true)}>
              Join with code
            </Button>
            <Button onClick={() => setNewBoardOpen(true)}>New board</Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}
        {loading ? (
          <p className="text-muted-foreground">Loading boards…</p>
        ) : projects.length === 0 ? (
          <p className="text-muted-foreground">
            No boards yet. Create one or join with a code.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/board/${project.id}`}
                  className="block overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent/50"
                >
                  <BoardCardPreview projectId={project.id} className="w-full" />
                  <div className="p-4">
                    <h2 className="font-medium">{project.name}</h2>
                    {project.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <NewBoardDialog open={newBoardOpen} onOpenChange={setNewBoardOpen} />
      <JoinByCodeDialog open={joinCodeOpen} onOpenChange={setJoinCodeOpen} />
    </div>
  );
}
