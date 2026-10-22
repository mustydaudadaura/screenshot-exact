import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALL_ROLES, type AppRole } from "./roles";

const roleEnum = z.enum(ALL_ROLES as [AppRole, ...AppRole[]]);

async function assertManager(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_manager", { _user_id: userId });
  if (error || !data) throw new Error("Only the owner or an administrator can do this.");
}

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        phone: z.string().trim().max(30).optional(),
        job_title: z.string().trim().max(80).optional(),
        roles: z.array(roleEnum).min(1),
        department_ids: z.array(z.string().uuid()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    const isOwner = (await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" })).data;
    if (data.roles.includes("owner") && !isOwner) throw new Error("Only the owner can grant the Owner role.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");
    const id = created.user.id;
    await supabaseAdmin.from("profiles").update({ phone: data.phone ?? null, job_title: data.job_title ?? null }).eq("id", id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    await supabaseAdmin.from("user_roles").insert(data.roles.map((role) => ({ user_id: id, role })));
    if (data.department_ids.length)
      await supabaseAdmin.from("staff_departments").insert(data.department_ids.map((department_id) => ({ user_id: id, department_id })));
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId, action: "create", entity: "staff", entity_id: id,
      details: { email: data.email, roles: data.roles },
    });
    return { id };
  });

export const updateStaffAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), roles: z.array(roleEnum).min(1), department_ids: z.array(z.string().uuid()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    const isOwner = (await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" })).data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.user_id);
    const hadOwner = (current ?? []).some((r) => r.role === "owner");
    if (!isOwner && (hadOwner || data.roles.includes("owner"))) throw new Error("Only the owner can change Owner access.");
    if (data.user_id === context.userId && hadOwner && !data.roles.includes("owner"))
      throw new Error("You cannot remove your own Owner role.");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").insert(data.roles.map((role) => ({ user_id: data.user_id, role })));
    await supabaseAdmin.from("staff_departments").delete().eq("user_id", data.user_id);
    if (data.department_ids.length)
      await supabaseAdmin.from("staff_departments").insert(data.department_ids.map((department_id) => ({ user_id: data.user_id, department_id })));
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId, action: "update_access", entity: "staff", entity_id: data.user_id,
      details: { roles: data.roles, department_ids: data.department_ids },
    });
    return { ok: true };
  });

export const setStaffActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("You cannot deactivate your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ is_active: data.active }).eq("id", data.user_id);
    await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: data.active ? "none" : "876000h" });
    return { ok: true };
  });
