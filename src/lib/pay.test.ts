import { describe, expect, it } from "vitest";
import { computePayroll, computeTeamPay } from "./pay";

describe("computeTeamPay", () => {
  it("multiplies bags by the rate per bag and splits equally", () => {
    expect(computeTeamPay(10, 500, 4)).toEqual({ total: 5000, perWorker: 1250 });
  });
  it("gives zero per worker when no workers are set", () => {
    expect(computeTeamPay(10, 500, 0).perWorker).toBe(0);
  });
});

describe("computePayroll", () => {
  const workers = [
    { id: "a", department_id: "bake" },
    { id: "b", department_id: "bake" },
    { id: "c", department_id: "bake" },
  ];
  it("splits a day's team pay only among workers who clocked in that day", () => {
    const r = computePayroll(
      [{ department_id: "bake", work_date: "2026-10-22", bags: 20, rate_per_bag: 300 }],
      [{ worker_id: "a", work_date: "2026-10-22" }, { worker_id: "b", work_date: "2026-10-22" }],
      workers,
    );
    expect(r.get("a")).toEqual({ days: 1, amount: 3000 });
    expect(r.get("c")).toEqual({ days: 0, amount: 0 });
  });
  it("uses the rate saved on each day's log", () => {
    const r = computePayroll(
      [
        { department_id: "bake", work_date: "2026-10-21", bags: 10, rate_per_bag: 100 },
        { department_id: "bake", work_date: "2026-10-22", bags: 10, rate_per_bag: 200 },
      ],
      [{ worker_id: "a", work_date: "2026-10-21" }, { worker_id: "a", work_date: "2026-10-22" }],
      workers,
    );
    expect(r.get("a")).toEqual({ days: 2, amount: 3000 });
  });
});
