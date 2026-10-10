"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatPaise } from "@/lib/format";

export function GrowthTreeVisual() {
  const [years, setYears] = useState(5);
  const principal = 100000; // ₹1,000 in paise
  const rate = 0.12;
  const compounded = Math.round(principal * Math.pow(1 + rate, years));
  const flat = Math.round(principal + principal * rate * years);

  return (
    <Card className="space-y-4 bg-accent/20 p-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>Time invested: {years} years</span>
        <input
          type="range"
          min="1"
          max="15"
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
          className="accent-primary"
        />
      </div>

      <div className="relative flex h-36 items-end justify-center overflow-hidden rounded-lg bg-card p-4">
        {/* Visual tree representation */}
        <div className="flex flex-col items-center transition-all duration-300">
          <div
            className="rounded-full bg-gain transition-all duration-300 shadow-md"
            style={{
              width: `${Math.min(24 + years * 8, 110)}px`,
              height: `${Math.min(24 + years * 8, 110)}px`,
            }}
          />
          <div
            className="w-4 bg-amber-800 rounded-b transition-all duration-300"
            style={{ height: `${20 + years * 3}px` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg bg-card p-2 shadow-sm">
          <p className="text-muted-foreground">With compounding (12%)</p>
          <p className="text-base font-bold text-gain">{formatPaise(compounded)}</p>
        </div>
        <div className="rounded-lg bg-card p-2 shadow-sm">
          <p className="text-muted-foreground">Simple flat growth</p>
          <p className="text-base font-bold text-muted-foreground">{formatPaise(flat)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Returns earn returns over time. The longer you wait, the faster the tree grows!
      </p>
    </Card>
  );
}

export function UnitsBoughtChartVisual() {
  return (
    <Card className="space-y-3 bg-accent/20 p-4">
      <p className="text-xs font-semibold text-muted-foreground">
        Monthly ₹2,000 SIP during market swings:
      </p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-card p-2 shadow-sm border-t-2 border-primary">
          <p className="font-bold text-primary">Normal year</p>
          <p className="text-muted-foreground">NAV: ₹200</p>
          <p className="text-sm font-bold text-foreground mt-1">10 units</p>
        </div>
        <div className="rounded-lg bg-card p-2 shadow-sm border-t-2 border-gain">
          <p className="font-bold text-gain">Market storm</p>
          <p className="text-muted-foreground">NAV: ₹100</p>
          <p className="text-sm font-bold text-gain mt-1">20 units!</p>
          <span className="text-[10px] text-gain font-semibold">Discount sale</span>
        </div>
        <div className="rounded-lg bg-card p-2 shadow-sm border-t-2 border-secondary">
          <p className="font-bold text-secondary">Boom year</p>
          <p className="text-muted-foreground">NAV: ₹300</p>
          <p className="text-sm font-bold text-foreground mt-1">6.6 units</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        SIP buys more units when prices fall. You don&apos;t need to guess the market!
      </p>
    </Card>
  );
}

export function SplitPieVisual() {
  return (
    <Card className="space-y-3 bg-accent/20 p-4">
      <div className="flex items-center justify-center gap-6">
        <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
          {/* Equity 50% */}
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray="44 44"
            strokeDashoffset="0"
            className="text-secondary"
          />
          {/* Debt 30% */}
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray="26.4 61.6"
            strokeDashoffset="-44"
            className="text-primary"
          />
          {/* Gold 20% */}
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray="17.6 70.4"
            strokeDashoffset="-70.4"
            className="text-coin"
          />
        </svg>
        <ul className="space-y-1.5 text-xs font-semibold">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-secondary" /> 50% Equity (Growth)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" /> 30% Debt/FD (Stability)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-coin" /> 20% Gold (Shock absorber)
          </li>
        </ul>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        When one asset faces a bad toss, the others cushion the fall. Don&apos;t put all eggs in one
        basket.
      </p>
    </Card>
  );
}

export function RealValueBadgeVisual() {
  const [years, setYears] = useState(5);
  const nominal = 10000000; // ₹1,00,000
  const inflation = 0.06;
  const realVal = Math.round(nominal / Math.pow(1 + inflation, years));

  return (
    <Card className="space-y-3 bg-accent/20 p-4">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>Years in cash: {years}</span>
        <input
          type="range"
          min="1"
          max="10"
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
          className="accent-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg bg-card p-2 shadow-sm">
          <p className="text-muted-foreground">Cash amount</p>
          <p className="text-base font-bold text-foreground">{formatPaise(nominal)}</p>
          <span className="text-[10px] text-muted-foreground">Number on note</span>
        </div>
        <div className="rounded-lg bg-card p-2 shadow-sm border border-loss/30">
          <p className="text-loss font-semibold">Real Buying Power</p>
          <p className="text-base font-bold text-loss">{formatPaise(realVal)}</p>
          <span className="text-[10px] text-loss">What it can actually buy</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Inflation quietly erodes idle cash. ₹1,00,000 today buys what ₹{Math.round(realVal / 100)}{" "}
        buys later.
      </p>
    </Card>
  );
}

export function StormTimelineVisual() {
  return (
    <Card className="space-y-3 bg-accent/20 p-4">
      <div className="rounded-lg bg-card p-3 shadow-sm text-xs space-y-2">
        <div className="flex justify-between items-center font-bold">
          <span className="text-loss">⛈️ Panic Seller</span>
          <span className="text-gain">🌱 Patient Investor</span>
        </div>
        <p className="text-muted-foreground text-[11px]">
          During a crash, the panic seller exits at -20% and misses the recovery. The patient
          investor stays invested through the cycle.
        </p>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        A crash is temporary unless you sell. Staying invested lets your portfolio bounce back.
      </p>
    </Card>
  );
}

export function GoalBucketsVisual() {
  return (
    <Card className="space-y-3 bg-accent/20 p-4">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-card p-2 shadow-sm border-t-2 border-secondary">
          <p className="font-bold">1. Emergency</p>
          <p className="text-[11px] text-muted-foreground">Savings / Cash</p>
          <span className="text-[10px] text-secondary font-semibold">3-6 mo expenses</span>
        </div>
        <div className="rounded-lg bg-card p-2 shadow-sm border-t-2 border-primary">
          <p className="font-bold">2. Near Goals</p>
          <p className="text-[11px] text-muted-foreground">FD / RD</p>
          <span className="text-[10px] text-primary font-semibold">1-3 years</span>
        </div>
        <div className="rounded-lg bg-card p-2 shadow-sm border-t-2 border-gain">
          <p className="font-bold">3. Long Growth</p>
          <p className="text-[11px] text-muted-foreground">Equity SIP</p>
          <span className="text-[10px] text-gain font-semibold">5+ years</span>
        </div>
      </div>
    </Card>
  );
}

export function HorizonSliderVisual() {
  const [horizon, setHorizon] = useState(3);
  return (
    <Card className="space-y-3 bg-accent/20 p-4">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>
          Goal horizon: {horizon} {horizon === 1 ? "year" : "years"}
        </span>
        <input
          type="range"
          min="1"
          max="10"
          value={horizon}
          onChange={(e) => setHorizon(Number(e.target.value))}
          className="accent-primary"
        />
      </div>
      <div className="rounded-lg bg-card p-3 shadow-sm text-center text-xs">
        {horizon <= 2 ? (
          <div>
            <p className="font-bold text-primary">Low risk: Bank FD / RD</p>
            <p className="text-muted-foreground text-[11px]">
              When you need money soon, safety beats growth.
            </p>
          </div>
        ) : horizon <= 5 ? (
          <div>
            <p className="font-bold text-secondary">Balanced: Mix of Debt & Equity</p>
            <p className="text-muted-foreground text-[11px]">
              Moderate horizon can absorb minor market bumps.
            </p>
          </div>
        ) : (
          <div>
            <p className="font-bold text-gain">Growth: Equity SIP</p>
            <p className="text-muted-foreground text-[11px]">
              Over long periods, equity has historically beaten inflation.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export function TechniqueVisual({ visualId }: { visualId: string }) {
  switch (visualId) {
    case "growth-tree":
      return <GrowthTreeVisual />;
    case "units-bought-chart":
      return <UnitsBoughtChartVisual />;
    case "split-pie":
      return <SplitPieVisual />;
    case "real-value-badge":
      return <RealValueBadgeVisual />;
    case "storm-timeline":
      return <StormTimelineVisual />;
    case "goal-buckets":
      return <GoalBucketsVisual />;
    case "horizon-slider":
      return <HorizonSliderVisual />;
    default:
      return null;
  }
}
