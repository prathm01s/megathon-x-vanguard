"use client";

import { Award, CheckCircle2, DollarSign, Sparkles, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContentIcon } from "@/components/game/icon";
import { useLocalize } from "@/components/game/use-localize";
import { content } from "@/lib/content";
import { formatPaise } from "@/lib/format";
import type { PublicMember, RoomMember } from "@toss/engine";

export interface AuctionModalProps {
  currentTurn: number;
  chapterId: string;
  me: RoomMember | null;
  members: PublicMember[];
  onClose: () => void;
  onBidSubmitted?: (amountPaise: number, isPool: boolean) => void;
}

export function AuctionModal({
  currentTurn,
  chapterId,
  me,
  members,
  onClose,
  onBidSubmitted,
}: AuctionModalProps) {
  const t = useTranslations("room");
  const tc = useTranslations("common");
  const loc = useLocalize();

  // Find auction matching chapter or turn, fallback to first auction
  const allAuctions = content.auctions.auctions;
  const currentAuction =
    allAuctions.find((a) => a.chapter === chapterId && a.turn === currentTurn) ??
    allAuctions.find((a) => a.chapter === chapterId) ??
    allAuctions[0];

  const minBidPaise = (currentAuction?.minBid ?? 20000) * 100;
  const trueValuePaise = (currentAuction?.trueValue ?? 45000) * 100;
  const cashPaise = me?.state.cash ?? 5000000;

  const [tab, setTab] = useState<"solo" | "pool">("pool");
  const [soloBidPaise, setSoloBidPaise] = useState(minBidPaise);
  const [poolContributionPaise, setPoolContributionPaise] = useState(minBidPaise / 2);
  const [resolved, setResolved] = useState(false);
  const [wonByPool, setWonByPool] = useState(false);
  const [winningBidPaise, setWinningBidPaise] = useState(0);

  // Simulated peer pool members
  const peerContributors = [
    { name: members[1]?.nickname ?? "Careful Kavya", amountPaise: minBidPaise * 0.4 },
    { name: members[2]?.nickname ?? "Spendy Sunny", amountPaise: minBidPaise * 0.2 },
  ];
  const totalPoolPaise =
    poolContributionPaise + peerContributors.reduce((acc, c) => acc + c.amountPaise, 0);
  const myPoolSharePct =
    totalPoolPaise > 0 ? Math.round((poolContributionPaise / totalPoolPaise) * 100) : 0;

  function handlePlaceSoloBid() {
    setWinningBidPaise(soloBidPaise);
    setWonByPool(false);
    setResolved(true);
    onBidSubmitted?.(soloBidPaise, false);
  }

  function handlePlacePoolBid() {
    setWinningBidPaise(totalPoolPaise);
    setWonByPool(true);
    setResolved(true);
    onBidSubmitted?.(poolContributionPaise, true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-card p-5 shadow-2xl overflow-hidden my-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
              <ContentIcon name={currentAuction?.icon} className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold leading-tight">
                {loc(currentAuction?.title)}
              </h2>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {t("auctionTitle")} • Turn {currentAuction?.turn ?? currentTurn}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={tc("close")}>
            <X className="size-5" />
          </Button>
        </div>

        {/* Item Summary Card */}
        <div className="rounded-xl border border-border bg-accent/20 p-3 space-y-2 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            {loc(currentAuction?.description)}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[11px]">
            <div>
              <span className="text-muted-foreground font-semibold">Minimum Bid:</span>{" "}
              <span className="font-extrabold">{formatPaise(minBidPaise)}</span>
            </div>
            {currentAuction?.returnStream && (
              <div>
                <span className="text-muted-foreground font-semibold">Yields:</span>{" "}
                <span className="font-extrabold text-gain">
                  {formatPaise(currentAuction.returnStream.amountPerTurn * 100)} / turn
                </span>
              </div>
            )}
          </div>
        </div>

        {!resolved ? (
          <>
            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setTab("pool")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  tab === "pool" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Users className="size-3.5" />
                {t("poolBid")}
              </button>
              <button
                type="button"
                onClick={() => setTab("solo")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  tab === "solo" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <DollarSign className="size-3.5" />
                Bid Solo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {tab === "pool" ? (
                /* Pool / Mutual Fund Bidding */
                <div className="space-y-4">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-primary">
                      <Sparkles className="size-4" />
                      <span>Pool Money with Classmates</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Large assets are expensive. By pooling together, everyone gets a proportional
                      share of future earnings!
                    </p>
                  </div>

                  {/* Pool Members contribution */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Current Group Pool
                    </span>
                    <ul className="space-y-1.5 text-xs">
                      {peerContributors.map((c) => (
                        <li
                          key={c.name}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-2"
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="font-bold tabular-nums">
                            {formatPaise(c.amountPaise)}
                          </span>
                        </li>
                      ))}
                      <li className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 p-2 font-bold text-primary">
                        <span>You (Your Contribution)</span>
                        <span className="tabular-nums">{formatPaise(poolContributionPaise)}</span>
                      </li>
                    </ul>

                    {/* Total Pool & Share Banner */}
                    <div className="flex items-center justify-between rounded-xl bg-accent p-3 font-extrabold text-xs">
                      <span>Total Pool Offer: {formatPaise(totalPoolPaise)}</span>
                      <span className="text-primary">Your Share: {myPoolSharePct}%</span>
                    </div>
                  </div>

                  {/* Contribution Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-muted-foreground">
                        Choose Your Contribution
                      </span>
                      <span className="font-extrabold text-sm">
                        {formatPaise(poolContributionPaise)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={100000}
                      max={Math.min(cashPaise, minBidPaise * 1.5)}
                      step={50000}
                      value={poolContributionPaise}
                      onChange={(e) => setPoolContributionPaise(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Min ₹1,000</span>
                      <span>Wallet: {formatPaise(cashPaise)}</span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full font-extrabold shadow-lg"
                    onClick={handlePlacePoolBid}
                  >
                    Submit Pool Contribution ({formatPaise(poolContributionPaise)})
                  </Button>
                </div>
              ) : (
                /* Solo Sealed Bid */
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs space-y-1">
                    <p className="font-bold">Sealed Bid Auction</p>
                    <p className="text-[11px] text-muted-foreground">
                      All bids remain hidden until submitted. The highest bidder wins the asset!
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-muted-foreground">Your Sealed Bid</span>
                      <span className="font-extrabold text-base">{formatPaise(soloBidPaise)}</span>
                    </div>
                    <input
                      type="range"
                      min={minBidPaise}
                      max={Math.min(cashPaise, minBidPaise * 2.5)}
                      step={50000}
                      value={soloBidPaise}
                      onChange={(e) => setSoloBidPaise(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex gap-2 pt-1">
                      {[minBidPaise, minBidPaise * 1.2, minBidPaise * 1.5].map((amt, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          size="default"
                          className="flex-1 text-xs font-bold"
                          onClick={() => setSoloBidPaise(amt)}
                        >
                          {formatPaise(amt)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full font-extrabold shadow-lg"
                    onClick={handlePlaceSoloBid}
                    disabled={soloBidPaise > cashPaise}
                  >
                    Submit Sealed Bid ({formatPaise(soloBidPaise)})
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Resolution / Reveal Screen */
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="text-center space-y-2">
              <span className="inline-grid size-12 place-items-center rounded-full bg-gain/20 text-gain">
                <CheckCircle2 className="size-7" />
              </span>
              <h3 className="text-lg font-extrabold">Auction Won!</h3>
              <p className="text-xs text-muted-foreground">
                Winning Bid:{" "}
                <span className="font-bold text-foreground">{formatPaise(winningBidPaise)}</span>
              </p>
            </div>

            {/* Value vs Price Lesson Card */}
            <Card className="p-3.5 space-y-2 border-2 border-coin/40 bg-coin/5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                <Award className="size-4 text-coin" />
                <span>Value vs. Price Lesson</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">True Asset Value:</span>
                <span className="font-bold text-gain">{formatPaise(trueValuePaise)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Price Paid:</span>
                <span className="font-bold">{formatPaise(winningBidPaise)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
                {winningBidPaise <= trueValuePaise
                  ? "Great deal! You acquired the asset for less than its true economic value."
                  : "Caution: Overbidding above true value cuts your future returns. In finance, price is what you pay; value is what you get."}
              </p>
            </Card>

            {/* Mutual Fund Reveal Card (CRITICAL PITCH MOMENT) */}
            {wonByPool && (
              <Card className="p-4 space-y-2.5 border-2 border-primary bg-primary/10 shadow-md">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <h4 className="font-extrabold text-sm text-primary">
                    {t("mutualFundRevealTitle")}
                  </h4>
                </div>
                <p className="text-xs leading-relaxed font-medium text-foreground">
                  {content.auctions.mutualFundRevealText?.en ?? t("mutualFundRevealBody")}
                </p>
                <div className="rounded-lg bg-card p-2.5 text-xs flex justify-between items-center font-bold">
                  <span>Your Share of Returns:</span>
                  <span className="text-gain">{myPoolSharePct}%</span>
                </div>
              </Card>
            )}

            <Button size="lg" className="w-full font-extrabold" onClick={onClose}>
              Continue Turn
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
