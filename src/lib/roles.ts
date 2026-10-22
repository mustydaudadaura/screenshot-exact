import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Super Admin (Owner)",
  admin: "Admin",
  supervisor: "Supervisor",
  storekeeper: "Storekeeper",
  baker: "Baker",
  mixer: "Mixer",
  packager: "Packager",
  dispatcher: "Dispatcher",
  distributor: "Distributor",
  sales: "Sales Officer",
  accountant: "Accountant",
  cleaner: "Cleaner",
  security: "Security Officer",
  staff: "Staff",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

/** Account types the Super Admin creates. */
export const ASSIGNABLE_ROLES: AppRole[] = ["owner", "admin", "accountant", "dispatcher", "distributor"];

export const ROLE_TASKS: Partial<Record<AppRole, string[]>> = {
  storekeeper: ["Receive Stock", "Issue Stock", "Transfer Stock", "Stock Count"],
  baker: ["My Production Tasks", "Record Output", "Report Rejected Products"],
  mixer: ["View Mixing Tasks", "Record Ingredients Used", "Submit Batch"],
  packager: ["Record Packaged Quantity", "Record Damaged Products"],
  dispatcher: ["Prepare Dispatch", "Confirm Delivery", "Submit Remittance"],
  distributor: ["My Orders", "Collect Products", "Record Payment", "Return Products"],
  sales: ["Record Sale", "Customer Orders", "Issue Receipt"],
  accountant: ["View Transactions", "Verify Payments", "Reconcile Accounts"],
  cleaner: ["View Cleaning Schedule", "Complete Checklist", "Report Problems"],
  security: ["Record Visitors", "Record Incidents", "View Access Instructions"],
  supervisor: ["Review Department Activity", "Approve Submissions", "Department Reports"],
};

export function isManager(roles: AppRole[]) {
  return roles.includes("owner") || roles.includes("admin");
}
