import type { ReactNode } from "react";
import { GuideDock } from "@/components/game/guide/guide";
import { ProgressSync } from "@/components/game/progress-sync";
import { AccountGate } from "@/components/ui/account-gate";

// Every student screen needs a signed-in student with a profile (redirects otherwise), and
// restores their progress from the server before showing anything.
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AccountGate role="student">
      <ProgressSync>
        {children}
        <GuideDock />
      </ProgressSync>
    </AccountGate>
  );
}
