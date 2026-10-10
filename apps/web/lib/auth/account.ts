// Where each kind of user belongs, and the preset avatars (§6: no photo uploads).
import type { Session } from "@/lib/data";

export const AVATARS = [
  { id: "avatar-1", emoji: "🦊", label: "Fox" },
  { id: "avatar-2", emoji: "🦉", label: "Owl" },
  { id: "avatar-3", emoji: "🐯", label: "Tiger" },
  { id: "avatar-4", emoji: "🐬", label: "Dolphin" },
  { id: "avatar-5", emoji: "🚀", label: "Rocket" },
] as const;

export function avatarEmoji(id: string | undefined): string {
  return AVATARS.find((a) => a.id === id)?.emoji ?? "🙂";
}

/** The screen a session should land on: setup first, then the NGO dashboard or the game. */
export function homeFor(session: Session): string {
  switch (session.status) {
    case "needs-setup":
      return "/setup";
    case "ready":
      return session.role === "ngo_admin" ? "/admin" : "/ladder";
    default:
      return "/login";
  }
}
