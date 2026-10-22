import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Wheat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Global Concept Bakery" },
      { name: "description", content: "Staff sign-in for the Global Concept Bakery Management System." },
      { property: "og:title", content: "Sign in — Global Concept Bakery" },
      { property: "og:description", content: "Staff sign-in for the Global Concept Bakery Management System." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message === "Invalid login credentials" ? "Wrong email or password" : error.message);
      navigate({ to: "/dashboard" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (data.session) navigate({ to: "/dashboard" });
      else toast.success("Check your email to confirm your account, then sign in.");
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-crust p-10 text-primary-foreground md:flex">
        <div className="flex items-center gap-2 font-display text-xl"><Wheat /> Global Concept Bakery</div>
        <div>
          <h1 className="font-display text-5xl leading-tight">Every loaf,<br />every naira,<br />accounted for.</h1>
          <p className="mt-4 max-w-sm opacity-90">Production, stock, dispatch and staff — one place for the whole bakery.</p>
        </div>
        <div className="text-sm opacity-75">GCBMS</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="font-display text-3xl">{mode === "in" ? "Staff sign in" : "Create owner account"}</h2>
          {mode === "up" && <p className="text-sm text-muted-foreground">The first account becomes the bakery owner. Staff accounts are created by the owner.</p>}
          {mode === "up" && <div><Label>Full name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-12" /></div>}
          <div><Label>Email</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-12" /></div>
          <div><Label>Password</Label><Input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-12" /></div>
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === "in" ? "Setting up for the first time? Create the owner account" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
