/** Team pay for a department: total = bags × rate, split equally among workers. */
export function computeTeamPay(bags: number, ratePerBag: number, workerCount: number) {
  const total = Math.max(0, bags) * Math.max(0, ratePerBag);
  const perWorker = workerCount > 0 ? Math.round((total / workerCount) * 100) / 100 : 0;
  return { total, perWorker };
}

export type ProdLog = { department_id: string; work_date: string; bags: number; rate_per_bag: number };
export type Punch = { worker_id: string; work_date: string };
export type PayWorker = { id: string; department_id: string };

/**
 * Payroll: for each day a team logs bags, its pay (bags × rate saved that day)
 * is shared equally among that team's workers who clocked in that day.
 */
export function computePayroll(logs: ProdLog[], punches: Punch[], workers: PayWorker[]) {
  const dept = new Map(workers.map((w) => [w.id, w.department_id]));
  const present = new Map<string, Set<string>>(); // `${dept}|${date}` -> worker ids
  for (const p of punches) {
    const d = dept.get(p.worker_id);
    if (!d) continue;
    const k = `${d}|${p.work_date}`;
    if (!present.has(k)) present.set(k, new Set());
    present.get(k)!.add(p.worker_id);
  }
  const out = new Map<string, { days: number; amount: number }>();
  for (const w of workers) out.set(w.id, { days: 0, amount: 0 });
  for (const l of logs) {
    const ids = [...(present.get(`${l.department_id}|${l.work_date}`) ?? [])];
    const { perWorker } = computeTeamPay(Number(l.bags), Number(l.rate_per_bag), ids.length);
    for (const id of ids) {
      const r = out.get(id)!;
      r.days += 1;
      r.amount = Math.round((r.amount + perWorker) * 100) / 100;
    }
  }
  return out;
}

export const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(n);

export const lagosToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
