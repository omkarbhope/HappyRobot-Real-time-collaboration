"use client";

import { useCallback, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { Project } from "@/types/board";
import type { JoinByCodeResult } from "@/types/board";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiGet<Project[]>("/api/projects");
    if (res.error) {
      setError(res.error);
      setProjects([]);
    } else if (res.data) {
      setProjects(res.data);
    }
    setLoading(false);
    return res;
  }, []);

  const createProject = useCallback(
    async (name: string, description?: string | null) => {
      setError(null);
      const res = await apiPost<Project>("/api/projects", {
        name,
        description: description ?? null,
      });
      if (res.error) {
        setError(res.error);
        return null;
      }
      return res.data ?? null;
    },
    []
  );

  const joinByCode = useCallback(async (code: string) => {
    setError(null);
    const res = await apiPost<JoinByCodeResult>("/api/invite/join", {
      code: code.trim(),
    });
    if (res.error) {
      setError(res.error);
      return null;
    }
    return res.data ?? null;
  }, []);

  return {
    projects,
    loading,
    error,
    setError,
    fetchProjects,
    createProject,
    joinByCode,
  };
}
