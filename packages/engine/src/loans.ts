// Lending, borrowing, interest and Trust Score (§7.6), plus the forced bank borrowing
// that happens in single-player when a bad toss hits a player with no safety net.
import type { ContentBundle, MultiplayerConfig } from "@toss/content";
import { EngineError } from "./errors";
import type { GameState, Loan, Paise } from "./types";

type LoanConfig = MultiplayerConfig["loans"];

// ── Trust Score and bank rates ──────────────────────────────────────────────
export function clampTrust(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

/** Yearly bank rate for a Trust Score, or `null` when the bank refuses to lend. */
export function bankRateFor(trustScore: number, cfg: LoanConfig): number | null {
  const row = [...cfg.bankRateByTrust]
    .sort((a, b) => b.minTrust - a.minTrust)
    .find((r) => trustScore >= r.minTrust);
  return row?.ratePerYear ?? null;
}

/** Most a player may borrow from friends (`maxLoanMultipleOfIncome` × monthly income). */
// DECISION: the multiple applies to MONTHLY income, so it means the same in every chapter.
export function maxLoanFor(incomePerMonth: Paise, cfg: LoanConfig): Paise {
  return Math.round(incomePerMonth * cfg.maxLoanMultipleOfIncome);
}

// ── Friend loans (multiplayer) ──────────────────────────────────────────────
/** Interest accrued from `startTurn` up to `turn` (whole turns). */
export function interestAccrued(loan: Loan, turn: number): Paise {
  const n = Math.max(0, turn - loan.startTurn);
  if (loan.interestType === "simple") return Math.round(loan.principal * loan.ratePerTurn * n);
  return Math.round(loan.principal * (Math.pow(1 + loan.ratePerTurn, n) - 1));
}

/** What the borrower still owes at `turn`. */
export function amountOwed(loan: Loan, turn: number): Paise {
  return Math.max(0, loan.principal + interestAccrued(loan, turn) - loan.repaidAmount);
}

export function validateOfferRate(ratePerTurn: number, cfg: LoanConfig): void {
  if (ratePerTurn < 0 || ratePerTurn > cfg.maxRatePerTurn) {
    throw new EngineError("bad_rate", `rate must be between 0 and ${cfg.maxRatePerTurn} per turn`);
  }
}

export interface LoanUpdate {
  loan: Loan;
  /** Change to the borrower's Trust Score. */
  trustDelta: number;
  /** Late fine charged to the borrower now. */
  fine: Paise;
}

/** Applies a repayment. Repaying in full on or before the due turn earns trust. */
export function repayLoan(loan: Loan, amount: Paise, turn: number, cfg: LoanConfig): LoanUpdate {
  if (loan.status !== "active" && loan.status !== "late") {
    throw new EngineError("bad_loan", "loan is not open");
  }
  const owed = amountOwed(loan, turn);
  const paid = Math.min(amount, owed);
  const next: Loan = { ...loan, repaidAmount: loan.repaidAmount + paid };
  if (paid < owed) return { loan: next, trustDelta: 0, fine: 0 };
  const onTime = turn <= loan.dueTurn && loan.status === "active";
  next.status = "repaid";
  return { loan: next, trustDelta: onTime ? cfg.trust.onTime : 0, fine: 0 };
}

/**
 * Called once per turn for every open loan: marks it late (fine + trust down) the
 * turn after it's due, and defaulted `defaultAfterTurnsLate` turns later (the lender
 * loses what's left; the borrower's trust drops sharply).
 */
export function settleLoanForTurn(loan: Loan, turn: number, cfg: LoanConfig): LoanUpdate {
  if (loan.status === "active" && turn > loan.dueTurn) {
    return {
      loan: { ...loan, status: "late" },
      trustDelta: cfg.trust.late,
      fine: Math.round(cfg.lateFine * 100),
    };
  }
  if (loan.status === "late" && turn > loan.dueTurn + cfg.defaultAfterTurnsLate) {
    return { loan: { ...loan, status: "defaulted" }, trustDelta: cfg.trust.default, fine: 0 };
  }
  return { loan, trustDelta: 0, fine: 0 };
}

// ── Forced bank borrowing (single-player) ───────────────────────────────────
/**
 * Yearly rate for an unplanned shortfall: the bank's rate for the player's trust, or the
 * loan app when the bank refuses. Returns whether it counts as high-interest debt.
 */
export function shortfallRate(
  state: GameState,
  content: ContentBundle,
): { ratePerYear: number; highInterest: boolean } {
  const cfg = content.multiplayer.loans;
  const bank = bankRateFor(state.trustScore, cfg);
  if (bank !== null) return { ratePerYear: bank, highInterest: false };
  const app = cfg.loanAppRatePerTurn;
  return {
    ratePerYear: state.turnUnit === "year" ? app : Math.pow(1 + app, 12) - 1,
    highInterest: true,
  };
}

/** Adds one month of interest to the bank debt. Returns the interest added. */
export function accrueDebtInterest(state: GameState, ratePerYear: number): Paise {
  if (state.debt <= 0) return 0;
  const interest = Math.round(state.debt * (Math.pow(1 + ratePerYear, 1 / 12) - 1));
  state.debt += interest;
  state.stats.interestPaid += interest;
  return interest;
}

/** Repays bank debt from spare cash. Returns the amount repaid. */
export function repayDebtFromCash(state: GameState): Paise {
  const pay = Math.min(state.debt, Math.max(0, state.cash));
  state.cash -= pay;
  state.debt -= pay;
  return pay;
}
