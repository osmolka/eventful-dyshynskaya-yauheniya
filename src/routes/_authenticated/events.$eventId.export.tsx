import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$eventId/export")({
  component: ExportPage,
});

interface Row {
  name: string;
  email: string;
  rsvp_status: string;
  checked_in_at: string | null;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(rows: Row[]): string {
  const header = ["Name", "Email", "RSVP status", "Check-in time"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.name ?? ""),
        csvEscape(r.email ?? ""),
        csvEscape(r.rsvp_status ?? ""),
        csvEscape(r.checked_in_at ? new Date(r.checked_in_at).toISOString() : ""),
      ].join(","),
    );
  }
  // BOM for Excel UTF-8 compatibility
  return "\uFEFF" + lines.join("\r\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ExportPage() {
  const { eventId } = Route.useParams();
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [eventTitle, setEventTitle] = useState<string>("Event");
  const [busy, setBusy] = useState<"rsvps" | "attendance" | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id, title, host_id")
        .eq("id", eventId)
        .maybeSingle();
      if (!ev) {
        setAllowed(false);
        return;
      }
      setEventTitle(ev.title);
      const { data: ok } = await supabase.rpc("is_host_role", { _host_id: ev.host_id });
      setAllowed(Boolean(ok));
    })();
  }, [eventId, user, loading]);

  const fetchRows = async (): Promise<Row[] | null> => {
    const { data, error } = await supabase.rpc("export_event_rsvps", { _event_id: eventId });
    if (error) {
      toast.error(error.message);
      return null;
    }
    return (data ?? []) as Row[];
  };

  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";

  const handleExportRsvps = async () => {
    setBusy("rsvps");
    const rows = await fetchRows();
    setBusy(null);
    if (!rows) return;
    downloadCsv(`${slug(eventTitle)}-rsvps.csv`, buildCsv(rows));
  };

  const handleExportAttendance = async () => {
    setBusy("attendance");
    const rows = await fetchRows();
    setBusy(null);
    if (!rows) return;
    const attended = rows.filter((r) => r.checked_in_at);
    downloadCsv(`${slug(eventTitle)}-attendance.csv`, buildCsv(attended));
  };

  if (loading || allowed === null) {
    return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;
  }
  if (!allowed) {
    return (
      <div className="p-10 text-sm text-muted-foreground">
        Only Hosts can export CSVs for this event.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <BackButton />
        <header>
          <p className="text-sm text-muted-foreground">Export</p>
          <h1 className="text-3xl font-bold tracking-tight">{eventTitle}</h1>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">RSVPs</CardTitle>
            <CardDescription>All RSVPs for this event (confirmed and waitlisted).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportRsvps} disabled={busy !== null}>
              {busy === "rsvps" ? "Preparing..." : "Download RSVPs CSV"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attendance</CardTitle>
            <CardDescription>Only attendees who have been checked in.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportAttendance} disabled={busy !== null}>
              {busy === "attendance" ? "Preparing..." : "Download Attendance CSV"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
