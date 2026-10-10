import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { PlaceholderScreen } from "@/components/ui/placeholder-screen";

// NGO admin dashboard (§4.7, §9.2 #19). Owner: Prathmesh.
export default function AdminPage({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <PlaceholderScreen title="NGO dashboard" owner="Prathmesh" />;
}
