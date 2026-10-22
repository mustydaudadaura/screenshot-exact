import { describe, expect, it } from "vitest";
import { computeTeamPay } from "./pay";

describe("computeTeamPay", () => {
  it("multiplies bags by the rate per bag and splits equally", () => {
    expect(computeTeamPay(10, 500, 4)).toEqual({ total: 5000, perWorker: 1250 });
  });
  it("gives zero per worker when no workers are set", () => {
    expect(computeTeamPay(10, 500, 0).perWorker).toBe(0);
  });
});
