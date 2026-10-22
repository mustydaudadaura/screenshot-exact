import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/am-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { getSetupStatus, setupOwner } from "@/lib/setup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — A&M Global Concept Bakery" },
      { name: "description", content: "Staff sign-in for the Global Concept Bakery Management System." },
      { property: "og:title", content: "Sign in — A&M Global Concept Bakery" },
      { property: "og:description", content: "Staff sign-in for the Global Concept Bakery Management System." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [needsOwner, setNeedsOwner] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSetupStatus().then((s) => setNeedsOwner(s.needsOwner)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    try {
      if (needsOwner) await setupOwner({ data: { full_name: name, email, password } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === "Invalid login credentials" ? "Wrong email or password" : error.message);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message?.startsWith("[") ? "Enter your name, a valid email and a password of 8+ characters." : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-crust p-10 text-primary-foreground md:flex">
        <div className="font-display text-xl tracking-wide">A&amp;M GLOBAL CONCEPT <span className="text-gold">BAKERY</span></div>
        <div>
          <h1 className="font-display text-5xl leading-tight">Every loaf,<br />every naira,<br />accounted for.</h1>
          <p className="mt-4 max-w-sm text-lg italic opacity-90">Fresh Bread, Healthy Lives</p>
          <div className="mt-4 h-1 w-24 rounded bg-accent" />
        </div>
        <div className="text-sm opacity-75">GCBMS</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <img src={logo.url} alt="A&M Global Concept Bakery" className="mx-auto h-40 w-auto" />
          <h2 className="font-display text-3xl">{needsOwner ? "Set up Super Admin" : "Sign in"}</h2>
          <p className="text-sm text-muted-foreground">
            {needsOwner
              ? "One-time setup: create the owner's Super Admin account. After this, only the Super Admin can create accounts."
              : "Use the email and password given to you by the Super Admin."}
          </p>
          {needsOwner && <div><Label>Full name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-12" /></div>}
          <div><Label>Email</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-12" /></div>
          <div><Label>Password</Label><Input required minLength={needsOwner ? 8 : undefined} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-12" /></div>
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>
            {busy ? "Please wait…" : needsOwner ? "Create Super Admin" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
