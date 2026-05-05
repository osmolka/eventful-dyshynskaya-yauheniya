import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/host/dashboard")({
  component: HostDashboardPage,
});

interface EventRow {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  status: "draft" | "published";
  going: number;
  waitlist: number;
  checkedIn: number;
}

function HostDashboardPage() {
  const { user } = useAuth();
  const [isHost, setIsHost] = useState<boolean | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Find a host the user belongs to (owner or "host" role)
      const { data: ownHost } = await supabase
        .from("hosts")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      let hostId = ownHost?.id ?? null;
      if (!hostId) {
        const { data: m } = await supabase
          .from("host_members")
          .select("host_id")
          .eq("profile_id", user.id)
          .eq("role", "host")
          .maybeSingle();
        hostId = m?.host_id ?? null;
      }
      if (!hostId) {
        setIsHost(false);
        return;
      }
      setIsHost(true);

      const { data: evs } = await supabase
        .from("events")
        .select("id, title, start_at, end_at, status")
        .eq("host_id", hostId)
        .order("start_at", { ascending: true });

      const baseEvents = evs ?? [];
      const rows: EventRow[] = await Promise.all(
        baseEvents.map(async (e) => {
          const [{ data: rsvps }, { data: confirmedRsvps }] = await Promise.all([
            supabase.from("rsvps").select("status").eq("event_id", e.id),
            supabase.from("rsvps").select("id").eq("event_id", e.id).eq("status", "confirmed"),
          ]);
          const going = (rsvps ?? []).filter((r) => r.status === "confirmed").length;
          const waitlist = (rsvps ?? []).filter((r) => r.status === "waitlisted").length;
          let checkedIn = 0;
          const ids = (confirmedRsvps ?? []).map((r) => r.id);
          if (ids.length > 0) {
            const { count } = await supabase
              .from("tickets")
              .select("id", { count: "exact", head: true })
              .in("rsvp_id", ids)
              .not("checked_in_at", "is", null);
            checkedIn = count ?? 0;
          }
          return { ...e, going, waitlist, checkedIn };
        }),
      );
      setEvents(rows);
    })();
  }, [user]);

  if (isHost === null) {
    return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;
  }
  if (!isHost) {
    return (
      <div className="min-h-screen bg-background p-10">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Hosts only</CardTitle>
            <CardDescription>Register as a Host to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/become-host">Become a Host</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const upcoming = (events ?? []).filter((e) => new Date(e.end_at) >= now);
  const past = (events ?? [])
    .filter((e) => new Date(e.end_at) < now)
    .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Host dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of your events.</p>
          </div>
          <Button asChild>
            <Link to="/events/new">New event</Link>
          </Button>
        </header>

        <Section title="Upcoming events" events={upcoming} emptyText="No upcoming events." />
        <Section title="Past events" events={past} emptyText="No past events yet." />
      </div>
    </div>
  );
}

function Section({ title, events, emptyText }: { title: string; events: EventRow[]; emptyText: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid gap-3">
          {events.map((e) => (
            <Card key={e.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base">{e.title}</CardTitle>
                  <CardDescription>{new Date(e.start_at).toLocaleString()}</CardDescription>
                  <Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/events/$eventId/check-in" params={{ eventId: e.id }}>
                      Check-in
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/events/$eventId/export" params={{ eventId: e.id }}>
                      Export CSV
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/events/$eventId/feedback-summary" params={{ eventId: e.id }}>
                      Feedback
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Stat label="Going" value={e.going} />
                  <Stat label="Waitlist" value={e.waitlist} />
                  <Stat label="Checked in" value={e.checkedIn} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
