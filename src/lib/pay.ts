/** Team pay for a department: total = bags × rate, split equally among active workers. */
export function computeTeamPay(bags: number, ratePerBag: number, workerCount: number) {
  const total = Math.max(0, bags) * Math.max(0, ratePerBag);
  const perWorker = workerCount > 0 ? Math.round((total / workerCount) * 100) / 100 : 0;
  return { total, perWorker };
}

export const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(n);
