import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { SimLab } from "./sim-lab";

// Balancing lab (§8.1 `/dev/sim`, §10). Owner: Samarth.
export default function DevSimPage({ params }: PageProps<"/[locale]/dev/sim">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <SimLab />;
}
