import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tickets/$ticketId")({
  component: TicketPage,
});

interface TicketDetails {
  id: string;
  code: string;
  created_at: string;
  rsvp: {
    id: string;
    user_id: string;
    event: {
      id: string;
      title: string;
      start_at: string;
      end_at: string;
      time_zone: string;
      venue_address: string | null;
      online_link: string | null;
      description: string | null;
    };
  };
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function downloadIcs(t: TicketDetails) {
  const e = t.rsvp.event;
  const location = e.online_link ?? e.venue_address ?? "";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lovable//Tickets//EN",
    "BEGIN:VEVENT",
    `UID:${t.id}@lovable`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(e.start_at)}`,
    `DTEND:${toIcsDate(e.end_at)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    `LOCATION:${escapeIcs(location)}`,
    e.description ? `DESCRIPTION:${escapeIcs(e.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function TicketPage() {
  const { ticketId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetails | null | undefined>(undefined);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      const { data } = await supabase
        .from("tickets")
        .select(
          "id, code, created_at, rsvp:rsvps!inner(id, user_id, event:events!inner(id, title, start_at, end_at, time_zone, venue_address, online_link, description))",
        )
        .eq("id", ticketId)
        .maybeSingle();
      setTicket((data as TicketDetails | null) ?? null);
    })();
  }, [ticketId, authLoading]);

  const handleCancel = async () => {
    if (!ticket) return;
    setCancelling(true);
    const { error } = await supabase.from("rsvps").delete().eq("id", ticket.rsvp.id);
    setCancelling(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("RSVP cancelled");
    navigate({ to: "/explore" });
  };

  if (authLoading || ticket === undefined) {
    return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;
  }
  if (ticket === null || ticket.rsvp.user_id !== user?.id) {
    return <div className="p-10 text-sm text-muted-foreground">Ticket not found.</div>;
  }

  const e = ticket.rsvp.event;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{e.title}</CardTitle>
            <CardDescription>
              {new Date(e.start_at).toLocaleString()} – {new Date(e.end_at).toLocaleString()} ({e.time_zone})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              {e.online_link ? (
                <a href={e.online_link} className="underline" target="_blank" rel="noreferrer">
                  {e.online_link}
                </a>
              ) : (
                e.venue_address
              )}
            </p>

            <div className="flex flex-col items-center gap-3 rounded-md border bg-background p-6">
              <div className="rounded-md bg-white p-4">
                <QRCodeSVG value={ticket.code} size={220} level="M" />
              </div>
              <p className="font-mono text-lg tracking-widest">{ticket.code}</p>
              <p className="text-xs text-muted-foreground">
                Issued {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => downloadIcs(ticket)}>Add to Calendar</Button>
              <Button variant="outline" asChild>
                <Link to="/events/$eventId" params={{ eventId: e.id }}>View event</Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="ml-auto">Cancel RSVP</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel your RSVP?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will release your spot. If there's a waitlist, the next person will be confirmed automatically.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep RSVP</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} disabled={cancelling}>
                      {cancelling ? "Cancelling..." : "Yes, cancel"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
