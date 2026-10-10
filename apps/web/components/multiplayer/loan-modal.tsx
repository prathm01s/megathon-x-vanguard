"use client";

import { AlertTriangle, Building, Handshake, Shield, Smartphone, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { content } from "@/lib/content";
import { formatPaise, formatRate } from "@/lib/format";
import type { Loan, RoomMember } from "@toss/engine";

export interface LoanModalProps {
  loans: Loan[];
  me: RoomMember | null;
  members: RoomMember[];
  currentTurn: number;
  onRequestLoan: (amountRupees: number, dueTurn: number) => void;
  onAcceptLoan: (loanId: string) => void;
  onRepayLoan: (loanId: string, amountPaise: number) => void;
  onClose: () => void;
}

export function LoanModal({
  loans,
  me,
  members,
  currentTurn,
  onRequestLoan,
  onAcceptLoan,
  onRepayLoan,
  onClose,
}: LoanModalProps) {
  const t = useTranslations("room");
  const tc = useTranslations("common");

  const [tab, setTab] = useState<"active" | "request">("active");
  const [requestRupees, setRequestRupees] = useState(10000);
  const [dueTurn, setDueTurn] = useState(currentTurn + 2);

  const trust = me?.trustScore ?? 50;
  const bankConfig = content.multiplayer.loans.bankRateByTrust.find(
    (b) => trust >= b.minTrust,
  );
  const bankRate = bankConfig?.ratePerTurn;

  const myActiveLoans = loans.filter(
    (l) => l.borrowerMemberId === me?.id && l.status === "active",
  );
  const myPendingRequests = loans.filter(
    (l) => l.borrowerMemberId === me?.id && (l.status === "requested" || l.status === "offered"),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-card p-5 shadow-2xl overflow-hidden my-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Handshake className="size-5 text-primary" />
            <h2 className="text-lg font-extrabold">{t("loansTitle")}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={tc("close")}>
            <X className="size-5" />
          </Button>
        </div>

        {/* Trust Score Banner */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-accent/40 p-3 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-coin" />
            <div>
              <span className="font-bold">{t("trustScore")}: {trust}/100</span>
              <p className="text-[10px] text-muted-foreground">{t("trustHelp")}</p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${
              tab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            My Loans ({myActiveLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("request")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${
              tab === "request" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t("requestLoan")}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {tab === "active" ? (
            <div className="space-y-3">
              {myActiveLoans.length === 0 && myPendingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <p>You have no active or pending loans.</p>
                  <Button
                    size="default"
                    variant="outline"
                    className="mt-3 text-xs font-bold"
                    onClick={() => setTab("request")}
                  >
                    Need emergency cash? Request a loan
                  </Button>
                </div>
              ) : (
                <>
                  {/* Active loans */}
                  {myActiveLoans.map((l) => {
                    const lender = members.find((m) => m.id === l.lenderMemberId);
                    const lenderName =
                      l.lenderMemberId === "bank"
                        ? "Big Bank"
                        : l.lenderMemberId === "loan-app"
                          ? "Quick Cash App"
                          : lender?.nickname ?? "Friend";
                    const totalRepay = Math.round(l.principal * (1 + l.ratePerTurn));

                    return (
                      <Card key={l.id} className="p-3.5 space-y-2 border-2 border-primary/30">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>Lender: {lenderName}</span>
                          <span className="text-sm font-extrabold tabular-nums">
                            {formatPaise(l.principal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Rate: {formatRate(l.ratePerTurn)} / turn</span>
                          <span>Due turn: {l.dueTurn}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="text-xs font-bold">
                            Total to Repay: {formatPaise(totalRepay)}
                          </span>
                          <Button
                            size="default"
                            className="h-8 text-xs font-bold"
                            onClick={() => onRepayLoan(l.id, totalRepay)}
                          >
                            {t("repay", { amount: formatPaise(totalRepay) })}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}

                  {/* Offers for pending requests */}
                  {myPendingRequests.map((req) => (
                    <Card key={req.id} className="p-3.5 space-y-3 bg-secondary/5 border-secondary/30">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-secondary">
                          Loan Requested: {formatPaise(req.principal)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">Due: Turn {req.dueTurn}</span>
                      </div>

                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-bold uppercase text-muted-foreground">
                          {t("offers")}:
                        </p>

                        {/* Friend Offer */}
                        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Users className="size-4 text-gain" />
                            <div>
                              <p className="font-bold">Friend Balanced Bala</p>
                              <p className="text-[10px] text-muted-foreground">3% fair interest</p>
                            </div>
                          </div>
                          <Button
                            size="default"
                            className="h-7 text-xs font-bold"
                            onClick={() => onAcceptLoan(req.id)}
                          >
                            {t("accept")}
                          </Button>
                        </div>

                        {/* Bank Offer */}
                        {bankRate ? (
                          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs">
                            <div className="flex items-center gap-2">
                              <Building className="size-4 text-primary" />
                              <div>
                                <p className="font-bold">Big Bank</p>
                                <p className="text-[10px] text-muted-foreground">{formatRate(bankRate)} institutional rate</p>
                              </div>
                            </div>
                            <Button
                              size="default"
                              variant="outline"
                              className="h-7 text-xs font-bold"
                              onClick={() => onAcceptLoan(req.id)}
                            >
                              {t("accept")}
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-muted p-2 text-[11px] text-muted-foreground">
                            Bank refused loan: Trust score is too low (&lt;20).
                          </div>
                        )}

                        {/* Loan App Offer (Dangerous) */}
                        <div className="flex items-center justify-between rounded-lg border border-loss/40 bg-loss/5 p-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Smartphone className="size-4 text-loss" />
                            <div>
                              <p className="font-bold text-loss">Instant Loan App</p>
                              <p className="text-[10px] text-loss font-semibold">15% predatory rate! (Hidden fees)</p>
                            </div>
                          </div>
                          <Button
                            size="default"
                            variant="destructive"
                            className="h-7 text-xs font-bold"
                            onClick={() => onAcceptLoan(req.id)}
                          >
                            {t("accept")}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </div>
          ) : (
            /* Loan Request Form */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  {t("loanAmount")} (Rupees)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="60000"
                  step="1000"
                  value={requestRupees}
                  onChange={(e) => setRequestRupees(Number(e.target.value))}
                  className="w-full rounded-lg border-2 border-border bg-card px-3 py-2 text-sm font-bold"
                />
                <p className="text-[10px] text-muted-foreground">
                  Max: ₹60,000 (2× monthly income cap)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  {t("loanDue")}
                </label>
                <div className="flex gap-2">
                  {[currentTurn + 1, currentTurn + 2, currentTurn + 3].map((turnVal) => (
                    <Button
                      key={turnVal}
                      type="button"
                      variant={dueTurn === turnVal ? "default" : "outline"}
                      className="flex-1 text-xs font-bold"
                      onClick={() => setDueTurn(turnVal)}
                    >
                      Turn {turnVal}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-primary">
                  <AlertTriangle className="size-4" />
                  <span>Borrowing Rules</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  On-time repayment raises Trust Score by +5. Late repayment incurs a ₹500 fine and drops Trust by -15.
                </p>
              </div>

              <Button
                size="lg"
                className="w-full font-extrabold"
                onClick={() => {
                  onRequestLoan(requestRupees, dueTurn);
                  setTab("active");
                }}
              >
                Send Loan Request
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
