import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — A&M Global Concept Bakery" },
      { name: "description", content: "Choose a new password for your bakery staff account." },
      { property: "og:title", content: "Set a new password — A&M Global Concept Bakery" },
      { property: "og:description", content: "Choose a new password for your bakery staff account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error("This reset link has expired. Ask for a new one from the sign-in page."); return; }
    toast.success("Password changed");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-3xl">Set a new password</h1>
        <div><Label>New password</Label><Input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-12" /></div>
        <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>{busy ? "Please wait…" : "Save password"}</Button>
      </form>
    </div>
  );
}
