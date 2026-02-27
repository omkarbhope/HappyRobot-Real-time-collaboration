import { getServerSession } from "next-auth";
import { authOptions } from "@/core/auth/config";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getRequiredSession() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/** Use in API routes: returns userId or null. Throws nothing. */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/** Use in API routes: returns userId or throws. */
export async function requireUserId(): Promise<string> {
  const session = await getRequiredSession();
  return session.user.id;
}
