"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect to sign-in if unauthenticated. Use on dashboard/board pages.
 * redirectTo: path to send user after sign-in (default current pathname).
 */
export function useRequireAuth(redirectTo?: string) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      const callbackUrl = redirectTo ?? pathname ?? "/dashboard";
      router.replace(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [session, status, router, pathname, redirectTo]);

  return { session, status, isAuthenticated: !!session?.user };
}
