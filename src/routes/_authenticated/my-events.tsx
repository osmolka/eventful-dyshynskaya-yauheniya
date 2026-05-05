import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";

interface EventRow {
  id: string;
  title: string;
  start_at: string;
  status: "draft" | "published";
  visibility: "public" | "unlisted";
}

export const Route = createFileRoute("/_authenticated/my-events")({
  component: MyEventsPage,
});

function MyEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const load = useCallback(async (hid: string) => {
    const { data } = await supabase
      .from("events")
      .select("id, title, start_at, status, visibility")
      .eq("host_id", hid)
      .order("start_at", { ascending: false });
    setEvents(data ?? []);
  }, []);

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
      setHostId(host.id);
      await load(host.id);
    })();
  }, [user, load]);

  const setStatus = async (id: string, status: "draft" | "published") => {
    const { error } = await supabase.from("events").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "published" ? "Event published" : "Event unpublished");
    if (hostId) await load(hostId);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <BackButton />
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
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{e.title}</CardTitle>
                    <CardDescription>
                      {new Date(e.start_at).toLocaleString()}
                    </CardDescription>
                    <div className="mt-2 flex gap-2">
                      <Badge variant={e.status === "published" ? "default" : "secondary"}>
                        {e.status}
                      </Badge>
                      <Badge variant="outline">{e.visibility}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {e.status === "draft" ? (
                      <Button size="sm" onClick={() => setStatus(e.id, "published")}>
                        Publish
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setStatus(e.id, "draft")}>
                        Unpublish
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" asChild>
                      <Link to="/events/$eventId/check-in" params={{ eventId: e.id }}>
                        Check-in
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
