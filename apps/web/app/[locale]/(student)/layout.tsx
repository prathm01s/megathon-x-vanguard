import type { ReactNode } from "react";
import { AccountGate } from "@/components/ui/account-gate";

// Every student screen needs a signed-in student with a profile (redirects otherwise).
export default function StudentLayout({ children }: { children: ReactNode }) {
  return <AccountGate role="student">{children}</AccountGate>;
}
