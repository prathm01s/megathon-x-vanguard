import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { PlaceholderScreen } from "@/components/ui/placeholder-screen";

// Student path choice → Student Code entry or personal signup (§4.2). Owner: Prathmesh.
export default function JoinPage({ params }: PageProps<"/[locale]/join">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <PlaceholderScreen title="Join Toss Life" owner="Prathmesh" />;
}
