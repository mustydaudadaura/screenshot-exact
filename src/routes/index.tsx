import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "GCBMS — Global Concept Bakery Management System" },
      { name: "description", content: "Bakery management for Global Concept Bakery: staff, departments, stock, production and sales." },
      { property: "og:title", content: "GCBMS — Global Concept Bakery Management System" },
      { property: "og:description", content: "Bakery management for Global Concept Bakery: staff, departments, stock, production and sales." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth" });
  },
  component: () => null,
});
