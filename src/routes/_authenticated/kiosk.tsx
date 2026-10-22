import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Delete, LogIn, LogOut, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { departmentsQuery } from "./departments";
import { lagosToday } from "@/lib/pay";

const kioskQuery = queryOptions({
  queryKey: ["kiosk", "today"],
  queryFn: async () => {
    const today = lagosToday();
    const [w, a] = await Promise.all([
      supabase.from("workers").select("id, full_name, department_id, pin").eq("is_active", true).order("full_name"),
      supabase.from("attendance").select("worker_id, clock_in, clock_out").eq("work_date", today),
    ]);
    if (w.error) throw w.error;
    return { workers: w.data, attendance: a.data ?? [] };
  },
});

export const Route = createFileRoute("/_authenticated/kiosk")({
  head: () => ({ meta: [{ title: "Attendance Kiosk — A&M Global Concept Bakery" }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(kioskQuery), context.queryClient.ensureQueryData(departmentsQuery)]),
  component: Kiosk,
});

const time = (t: string) => new Date(t).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

function Kiosk() {
  const { data } = useSuspenseQuery(kioskQuery);
  const { data: depts } = useSuspenseQuery(departmentsQuery);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<{ id: string; full_name: string } | null>(null);
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }));
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);

  const status = (id: string) => data.attendance.find((a) => a.worker_id === id);
  const list = data.workers.filter((w) => w.full_name.toLowerCase().includes(q.toLowerCase()));
  const noPin = data.workers.filter((w) => !w.pin).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-crust p-6 text-primary-foreground shadow-soft">
        <div>
          <h1 className="font-display text-3xl">Clock in / Clock out</h1>
          <p className="opacity-90">Tap your name, then enter your PIN.</p>
        </div>
        <div className="font-display text-5xl tabular-nums">{now}</div>
      </div>
      {noPin > 0 && <p className="mb-4 rounded-lg bg-accent/20 p-3 text-sm">{noPin} worker(s) have no PIN yet. Set PINs on the Workers &amp; Pay page.</p>}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find your name" className="h-12 pl-10 text-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((w) => {
          const s = status(w.id);
          const state = !s ? "absent" : s.clock_out ? "done" : "in";
          return (
            <button
              key={w.id}
              onClick={() => (state === "done" ? toast.info("Already clocked out today") : setPicked(w))}
              className={`rounded-xl border-2 p-4 text-left transition-transform active:scale-95 ${state === "in" ? "border-success bg-success/10" : state === "done" ? "border-border bg-muted opacity-70" : "border-border bg-card"}`}
            >
              <div className="text-lg font-semibold">{w.full_name}</div>
              <div className="text-xs text-muted-foreground">{depts.find((d) => d.id === w.department_id)?.name}</div>
              <div className="mt-2 text-sm">
                {state === "absent" && "Not in yet"}
                {state === "in" && <span className="text-success">In since {time(s!.clock_in)}</span>}
                {state === "done" && `${time(s!.clock_in)} – ${time(s!.clock_out!)}`}
              </div>
            </button>
          );
        })}
      </div>
      {picked && (
        <PinPad
          worker={picked}
          clockedIn={!!status(picked.id)}
          onClose={() => setPicked(null)}
          onDone={() => { setPicked(null); qc.invalidateQueries({ queryKey: ["kiosk"] }); }}
        />
      )}
    </div>
  );
}

function PinPad({ worker, clockedIn, onClose, onDone }: { worker: { id: string; full_name: string }; clockedIn: boolean; onClose: () => void; onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    if (pin.length < 4) return void toast.error("Enter your 4-digit PIN");
    setBusy(true);
    const { data, error } = await supabase.rpc("kiosk_punch", { _worker_id: worker.id, _pin: pin });
    setBusy(false);
    if (error) { setPin(""); return void toast.error(error.message); }
    toast.success(data === "in" ? `Welcome, ${worker.full_name}! Clocked in.` : `Goodbye, ${worker.full_name}! Clocked out.`);
    onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">{worker.full_name}</DialogTitle></DialogHeader>
        <div className="flex justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className={`h-4 w-4 rounded-full ${pin.length > i ? "bg-primary" : "bg-muted"}`} />)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <Button key={n} variant="secondary" className="h-16 text-2xl" onClick={() => pin.length < 4 && setPin(pin + n)}>{n}</Button>
          ))}
          <Button variant="ghost" className="h-16" onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete"><Delete /></Button>
          <Button variant="secondary" className="h-16 text-2xl" onClick={() => pin.length < 4 && setPin(pin + "0")}>0</Button>
          <Button className="h-16" onClick={submit} disabled={busy}>{clockedIn ? <LogOut /> : <LogIn />}</Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">{clockedIn ? "Press the button to clock out" : "Press the button to clock in"}</p>
      </DialogContent>
    </Dialog>
  );
}
