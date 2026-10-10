import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware Link / router. Always import navigation from here, not from `next/link`. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
