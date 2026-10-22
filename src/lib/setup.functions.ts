import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ownerExists() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "owner");
  return (count ?? 0) > 0;
}

// Public: only tells whether first-time setup is still open.
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => ({ needsOwner: !(await ownerExists()) }));

// Public but one-time: works only while no Super Admin exists.
export const setupOwner = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ full_name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(255), password: z.string().min(8).max(72) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (await ownerExists()) throw new Error("Setup is already complete. Ask the Super Admin for an account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
