import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
});

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  time_zone: string;
  venue_address: string | null;
  online_link: string | null;
  cover_image_url: string | null;
  capacity: number;
  status: string;
  visibility: string;
  host_id: string;
}

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRow | null | undefined>(undefined);
  const [confirmedCount, setConfirmedCount] = useState<number>(0);
  const [myRsvp, setMyRsvp] = useState<{ id: string; status: string } | null>(null);
  const [myTicket, setMyTicket] = useState<{ code: string; created_at: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select(
          "id, title, description, start_at, end_at, time_zone, venue_address, online_link, cover_image_url, capacity, status, visibility, host_id",
        )
        .eq("id", eventId)
        .maybeSingle();
      setEvent(data ?? null);
    })();
  }, [eventId]);

  const refreshRsvpInfo = async () => {
    const { count } = await supabase
      .from("rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "confirmed");
    setConfirmedCount(count ?? 0);

    if (user) {
      const { data } = await supabase
        .from("rsvps")
        .select("id, status")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      setMyRsvp(data ?? null);

      if (data && data.status === "confirmed") {
        const { data: ticket } = await supabase
          .from("tickets")
          .select("code, created_at")
          .eq("rsvp_id", data.id)
          .maybeSingle();
        setMyTicket(ticket ?? null);
      } else {
        setMyTicket(null);
      }
    } else {
      setMyRsvp(null);
      setMyTicket(null);
    }
  };

  useEffect(() => {
    if (!event) return;
    refreshRsvpInfo();
    const channel = supabase
      .channel(`rsvps:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${eventId}` },
        () => refreshRsvpInfo(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, user?.id]);

  const handleRsvp = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/events/${eventId}` } });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("rsvps")
      .insert({ event_id: eventId, user_id: user.id, status: "confirmed" })
      .select("id, status")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMyRsvp({ id: data.id, status: data.status });
    toast.success(data.status === "confirmed" ? "You're confirmed!" : "Added to the waitlist");
    refreshRsvpInfo();
  };

  if (event === undefined || authLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;
  }
  if (event === null || event.status !== "published") {
    return <div className="p-10 text-sm text-muted-foreground">Event not found.</div>;
  }

  const seatsLeft = Math.max(0, event.capacity - confirmedCount);
  const isFull = event.capacity > 0 && seatsLeft === 0;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {event.cover_image_url && (
          <img
            src={event.cover_image_url}
            alt=""
            className="aspect-video w-full rounded-lg object-cover"
          />
        )}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(event.start_at).toLocaleString()} – {new Date(event.end_at).toLocaleString()} ({event.time_zone})
          </p>
          <p className="text-sm">
            {event.online_link ? (
              <a href={event.online_link} className="underline" target="_blank" rel="noreferrer">
                Online event
              </a>
            ) : (
              event.venue_address
            )}
          </p>
        </div>

        {event.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">RSVP</CardTitle>
            <CardDescription>
              {event.capacity > 0
                ? `${confirmedCount} / ${event.capacity} confirmed`
                : `${confirmedCount} confirmed`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {myRsvp ? (
              <>
                <Badge variant={myRsvp.status === "confirmed" ? "default" : "secondary"}>
                  {myRsvp.status === "confirmed" ? "You're going" : "Waitlisted"}
                </Badge>
                {myRsvp.status === "confirmed" && myTicket && (
                  <div className="flex flex-col items-center gap-3 rounded-md border bg-background p-4">
                    <div className="rounded-md bg-white p-3">
                      <QRCodeSVG value={myTicket.code} size={160} level="M" />
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-sm tracking-widest">{myTicket.code}</p>
                      <p className="text-xs text-muted-foreground">
                        Issued {new Date(myTicket.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Button onClick={handleRsvp} disabled={submitting}>
                {submitting ? "Submitting..." : isFull ? "Join waitlist" : "RSVP"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
