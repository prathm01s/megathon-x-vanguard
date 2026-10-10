import { ch2Turn2 } from "@toss/engine/fixtures";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { AssumedReturn, MoneyPair } from "@/components/game/money";
import { PlaceholderScreen } from "@/components/ui/placeholder-screen";
import { content } from "@/lib/content";

// Turn screen (§9.2 #10). Owner: Pragya. For now it renders the engine fixture so the
// design system can be checked against real engine data.
export default function PlayPage({ params }: PageProps<"/[locale]/play">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const snapshot = ch2Turn2.history.at(-1)!;
  const equity = content.options.options.find((o) => o.id === "equity-fund")!;

  return (
    <PlaceholderScreen title="Chapter 2 · Turn screen" owner="Pragya">
      <MoneyPair amount={snapshot.amount} realValue={snapshot.realValue} />
      <p className="flex items-center justify-between">
        <span>{equity.name.en}</span>
        <AssumedReturn rate={equity.assumedAverageReturn} />
      </p>
    </PlaceholderScreen>
  );
}
