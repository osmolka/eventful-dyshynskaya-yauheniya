import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$eventId/check-in")({
  component: CheckInPage,
});

const codeSchema = z
  .string()
  .trim()
  .min(4, "Code is too short")
  .max(32, "Code is too long")
  .regex(/^[A-Za-z0-9]+$/, "Code must be alphanumeric");

interface EventInfo {
  id: string;
  title: string;
}

function CheckInPage() {
  const { eventId } = Route.useParams();
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<{ ticketId: string; code: string } | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id, title")
        .eq("id", eventId)
        .maybeSingle();
      setEvent(ev ?? null);

      const { data: ok } = await supabase.rpc("can_check_in_event", { _event_id: eventId });
      setAllowed(Boolean(ok));
    })();
  }, [eventId, user, loading]);

  const refreshCounts = async () => {
    const { count: confirmed } = await supabase
      .from("rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "confirmed");
    setConfirmedCount(confirmed ?? 0);

    const { data: confirmedRsvps } = await supabase
      .from("rsvps")
      .select("id")
      .eq("event_id", eventId)
      .eq("status", "confirmed");
    const ids = (confirmedRsvps ?? []).map((r) => r.id);
    if (ids.length === 0) {
      setCheckedInCount(0);
      return;
    }
    const { count: checked } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("rsvp_id", ids)
      .not("checked_in_at", "is", null);
    setCheckedInCount(checked ?? 0);
  };

  useEffect(() => {
    if (!allowed) return;
    refreshCounts();
    const channel = supabase
      .channel(`checkin:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => refreshCounts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${eventId}` },
        () => refreshCounts(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, eventId]);

  const handleCheckIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const normalized = parsed.data.toUpperCase();

    setSubmitting(true);
    setLastResult(null);

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("id, checked_in_at, rsvp:rsvps!inner(event_id, user_id)")
      .eq("code", normalized)
      .maybeSingle();

    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    if (!ticket) {
      setSubmitting(false);
      toast.error("Ticket not found");
      setLastResult("Ticket not found");
      return;
    }
    // Validate ticket belongs to this event
    const rsvp = ticket.rsvp as unknown as { event_id: string; user_id: string };
    if (rsvp.event_id !== eventId) {
      setSubmitting(false);
      toast.error("This ticket is for a different event");
      setLastResult("Ticket does not belong to this event");
      return;
    }
    if (ticket.checked_in_at) {
      setSubmitting(false);
      toast.error(`Already checked in at ${new Date(ticket.checked_in_at).toLocaleString()}`);
      setLastResult(`Already checked in at ${new Date(ticket.checked_in_at).toLocaleString()}`);
      return;
    }

    const { error: updateError } = await supabase
      .from("tickets")
      .update({ checked_in_at: new Date().toISOString(), checked_in_by: user.id })
      .eq("id", ticket.id)
      .is("checked_in_at", null);

    setSubmitting(false);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    toast.success(`Checked in: ${normalized}`);
    setLastResult(`✓ Checked in: ${normalized}`);
    setLastCheckIn({ ticketId: ticket.id, code: normalized });
    setCode("");
    refreshCounts();
  };

  const handleUndo = async () => {
    if (!lastCheckIn) return;
    setUndoing(true);
    const { error } = await supabase
      .from("tickets")
      .update({ checked_in_at: null, checked_in_by: null })
      .eq("id", lastCheckIn.ticketId)
      .not("checked_in_at", "is", null);
    setUndoing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Undid check-in: ${lastCheckIn.code}`);
    setLastResult(`Undid check-in: ${lastCheckIn.code}`);
    setLastCheckIn(null);
    refreshCounts();
  };

  if (loading || allowed === null) {
    return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;
  }
  if (!allowed) {
    return (
      <div className="p-10 text-sm text-muted-foreground">
        You don't have permission to check in attendees for this event.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <BackButton />
        <header>
          <p className="text-sm text-muted-foreground">Check-in</p>
          <h1 className="text-3xl font-bold tracking-tight">{event?.title ?? "Event"}</h1>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Confirmed</CardDescription>
              <CardTitle className="text-3xl">{confirmedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Checked in</CardDescription>
              <CardTitle className="text-3xl">{checkedInCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enter ticket code</CardTitle>
            <CardDescription>Type the code from the attendee's ticket.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Ticket code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(ev) => setCode(ev.target.value)}
                  placeholder="e.g. AB23CDEF45GH"
                  autoComplete="off"
                  autoFocus
                  maxLength={32}
                  className="font-mono uppercase tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Checking..." : "Check in"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleUndo}
                disabled={!lastCheckIn || undoing}
              >
                {undoing
                  ? "Undoing..."
                  : lastCheckIn
                    ? `Undo last check-in (${lastCheckIn.code})`
                    : "Undo last check-in"}
              </Button>
              {lastResult && (
                <p className="text-sm text-muted-foreground">{lastResult}</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
