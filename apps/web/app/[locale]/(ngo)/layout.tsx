import type { ReactNode } from "react";
import { AccountGate } from "@/components/ui/account-gate";

// The NGO dashboard needs a signed-in NGO admin with a profile (redirects otherwise).
export default function NgoLayout({ children }: { children: ReactNode }) {
  return <AccountGate role="ngo_admin">{children}</AccountGate>;
}
