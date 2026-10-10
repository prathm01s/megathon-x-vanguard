import { describe, expect, it } from "vitest";
import { evaluateCondition } from "../src/conditions";

const metrics: Record<string, number | boolean | string> = { a: 5, b: true, p: "safe-keeper" };
const get = (id: string) => metrics[id];

describe("condition DSL", () => {
  it("supports every comparison operator", () => {
    expect(evaluateCondition({ metric: "a", op: "==", value: 5 }, get)).toBe(true);
    expect(evaluateCondition({ metric: "a", op: "!=", value: 5 }, get)).toBe(false);
    expect(evaluateCondition({ metric: "a", op: ">", value: 4 }, get)).toBe(true);
    expect(evaluateCondition({ metric: "a", op: ">=", value: 5 }, get)).toBe(true);
    expect(evaluateCondition({ metric: "a", op: "<", value: 5 }, get)).toBe(false);
    expect(evaluateCondition({ metric: "a", op: "<=", value: 5 }, get)).toBe(true);
    expect(evaluateCondition({ metric: "p", op: "in", value: ["safe-keeper", "x"] }, get)).toBe(
      true,
    );
    expect(evaluateCondition({ metric: "b", op: "==", value: true }, get)).toBe(true);
  });

  it("supports all / any / not / always", () => {
    const yes = { metric: "a", op: "==", value: 5 } as const;
    const no = { metric: "a", op: "==", value: 6 } as const;
    expect(evaluateCondition({ all: [yes, no] }, get)).toBe(false);
    expect(evaluateCondition({ any: [yes, no] }, get)).toBe(true);
    expect(evaluateCondition({ not: no }, get)).toBe(true);
    expect(evaluateCondition({ always: true }, get)).toBe(true);
  });

  it("treats unknown metrics and type mismatches as false", () => {
    expect(evaluateCondition({ metric: "missing", op: "==", value: 1 }, get)).toBe(false);
    expect(evaluateCondition({ metric: "p", op: ">", value: 1 }, get)).toBe(false);
  });
});
