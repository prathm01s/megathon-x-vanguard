import { describe, expect, it } from "vitest";
import {
  amountOwed,
  bankRateFor,
  interestAccrued,
  maxLoanFor,
  repayLoan,
  settleLoanForTurn,
  validateOfferRate,
} from "../src/loans";
import type { Loan } from "../src/types";
import { content } from "./helpers";

const cfg = () => content().multiplayer.loans;
const loan = (over: Partial<Loan> = {}): Loan => ({
  id: "l1",
  lenderMemberId: "a",
  borrowerMemberId: "b",
  principal: 10000_00,
  ratePerTurn: 0.02,
  interestType: "simple",
  startTurn: 1,
  dueTurn: 3,
  status: "active",
  repaidAmount: 0,
  ...over,
});

describe("interest", () => {
  it("simple interest grows linearly", () => {
    expect(interestAccrued(loan(), 3)).toBe(400_00); // 2 turns × 2%
  });

  it("compound interest earns interest on interest", () => {
    expect(interestAccrued(loan({ interestType: "compound" }), 3)).toBe(404_00); // 1.02² − 1
  });

  it("amount owed subtracts repayments", () => {
    expect(amountOwed(loan({ repaidAmount: 5000_00 }), 3)).toBe(5400_00);
  });
});

describe("repaying and Trust Score", () => {
  it("repaying in full on time raises trust", () => {
    const r = repayLoan(loan(), 10400_00, 3, cfg());
    expect(r.loan.status).toBe("repaid");
    expect(r.trustDelta).toBe(cfg().trust.onTime);
  });

  it("a partial repayment keeps the loan open", () => {
    const r = repayLoan(loan(), 1000_00, 2, cfg());
    expect(r.loan.status).toBe("active");
    expect(r.loan.repaidAmount).toBe(1000_00);
  });

  it("past the due turn the loan goes late (fine, trust down), then defaults", () => {
    const late = settleLoanForTurn(loan(), 4, cfg());
    expect(late.loan.status).toBe("late");
    expect(late.trustDelta).toBe(cfg().trust.late);
    expect(late.fine).toBe(cfg().lateFine * 100);
    const stillLate = settleLoanForTurn(late.loan, 3 + cfg().defaultAfterTurnsLate, cfg());
    expect(stillLate.loan.status).toBe("late");
    const defaulted = settleLoanForTurn(late.loan, 4 + cfg().defaultAfterTurnsLate, cfg());
    expect(defaulted.loan.status).toBe("defaulted");
    expect(defaulted.trustDelta).toBe(cfg().trust.default);
  });

  it("repaying a late loan settles it without a trust bonus", () => {
    const r = repayLoan(loan({ status: "late" }), 99999_00, 5, cfg());
    expect(r.loan.status).toBe("repaid");
    expect(r.trustDelta).toBe(0);
  });
});

describe("limits and bank rates", () => {
  it("friends can't charge more than the configured maximum", () => {
    expect(() => validateOfferRate(cfg().maxRatePerTurn + 0.01, cfg())).toThrow();
    expect(() => validateOfferRate(cfg().maxRatePerTurn, cfg())).not.toThrow();
  });

  it("a lower Trust Score means a higher bank rate, then no bank loan at all", () => {
    expect(bankRateFor(80, cfg())).toBe(0.1);
    expect(bankRateFor(50, cfg())).toBe(0.14);
    expect(bankRateFor(25, cfg())).toBe(0.2);
    expect(bankRateFor(10, cfg())).toBeNull();
  });

  it("caps friend loans at a multiple of monthly income", () => {
    expect(maxLoanFor(30000_00, cfg())).toBe(60000_00);
  });
});
