import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventRow {
  id: string;
  title: string;
  start_at: string;
  status: "draft" | "published";
}

export const Route = createFileRoute("/_authenticated/my-events")({
  component: MyEventsPage,
});

function MyEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: host } = await supabase
        .from("hosts")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (!host) {
        setIsHost(false);
        setEvents([]);
        return;
      }
      setIsHost(true);
      const { data } = await supabase
        .from("events")
        .select("id, title, start_at, status")
        .eq("host_id", host.id)
        .order("start_at", { ascending: false });
      setEvents(data ?? []);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">My events</h1>
          {isHost && (
            <Button asChild>
              <Link to="/events/new">New event</Link>
            </Button>
          )}
        </div>

        {!isHost ? (
          <Card>
            <CardHeader>
              <CardTitle>Hosts only</CardTitle>
              <CardDescription>Register as a Host to create events.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/become-host">Become a Host</Link>
              </Button>
            </CardContent>
          </Card>
        ) : events === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <Card key={e.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{e.title}</CardTitle>
                    <CardDescription>
                      {new Date(e.start_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant={e.status === "published" ? "default" : "secondary"}>
                    {e.status}
                  </Badge>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
