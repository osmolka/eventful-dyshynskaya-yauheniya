import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/my-tickets")({
  component: MyTicketsPage,
});

interface TicketRow {
  id: string;
  rsvp: {
    event: {
      id: string;
      title: string;
      start_at: string;
      end_at: string;
      host: { name: string } | null;
    };
  };
}

function MyTicketsPage() {
  const { user, loading } = useAuth();
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("tickets")
        .select(
          "id, rsvp:rsvps!inner(user_id, event:events!inner(id, title, start_at, end_at, host:hosts(name)))",
        )
        .eq("rsvp.user_id", user.id)
        .gte("rsvp.event.end_at", nowIso)
        .order("created_at", { ascending: false });
      const rows = (data as unknown as TicketRow[] | null) ?? [];
      const upcoming = rows
        .filter((t) => new Date(t.rsvp.event.end_at) >= new Date())
        .sort(
          (a, b) =>
            new Date(a.rsvp.event.start_at).getTime() - new Date(b.rsvp.event.start_at).getTime(),
        );
      setTickets(upcoming);
    })();
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <BackButton />
        <header>
          <h1 className="text-3xl font-bold tracking-tight">My tickets</h1>
          <p className="text-sm text-muted-foreground">Your upcoming events.</p>
        </header>

        {tickets === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming tickets.</p>
        ) : (
          <div className="grid gap-4">
            {tickets.map((t) => (
              <Link key={t.id} to="/tickets/$ticketId" params={{ ticketId: t.id }}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">{t.rsvp.event.title}</CardTitle>
                    <CardDescription>
                      {new Date(t.rsvp.event.start_at).toLocaleString()}
                      {t.rsvp.event.host?.name ? ` · ${t.rsvp.event.host.name}` : ""}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
