import { redirect } from "@/i18n/navigation";

// The old code-first join page. Accounts are now email + password; an NGO code is entered while
// setting up the profile. Kept as a redirect so printed slips and old links still work.
export default async function JoinPage({ params }: PageProps<"/[locale]/join">) {
  const { locale } = await params;
  redirect({ href: "/signup", locale });
}
