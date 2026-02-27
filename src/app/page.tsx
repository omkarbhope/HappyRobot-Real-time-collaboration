"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HappyRobotLogo } from "@/components/happy-robot-logo";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
        <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card px-10 py-8 shadow-sm">
          <HappyRobotLogo size="lg" />
          <div className="text-center">
            <h1 className="text-xl font-semibold">You’re signed in</h1>
            <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
          </div>
          <Button asChild size="lg" className="w-full min-w-[200px]">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      {/* Subtle background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom_right,oklch(0.98_0.01_250_/_.4),oklch(1_0_0)),linear-gradient(to_top_left,oklch(0.97_0.01_200_/_.3),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.75 0 0 / 0.08) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-[400px]">
        <div className="rounded-2xl border bg-card/95 px-8 py-10 shadow-lg shadow-black/5 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-8">
            <HappyRobotLogo size="lg" className="justify-center" />

            <div className="space-y-2 text-center">
              <h1 className="text-lg font-medium text-foreground">
                Collaborative whiteboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in with Google to create and join boards.
              </p>
            </div>

            <Button
              size="lg"
              className="h-12 w-full gap-3 rounded-xl bg-foreground px-6 text-base font-medium text-background hover:bg-foreground/90"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              <GoogleIcon />
              Sign in with Google
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to use your Google account for HappyRobot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
