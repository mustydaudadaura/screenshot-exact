import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/roles";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const [{ data: profile }, { data: roles }, { data: deps }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("staff_departments").select("department_id, departments(name)").eq("user_id", u.user.id),
    ]);
    return {
      id: u.user.id,
      email: u.user.email ?? "",
      profile,
      roles: (roles ?? []).map((r) => r.role as AppRole),
      departments: (deps ?? []).map((d: any) => d.departments?.name as string).filter(Boolean),
    };
  },
});

export const useMe = () => useSuspenseQuery(meQuery).data;
