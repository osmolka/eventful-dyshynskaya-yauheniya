import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageLoader } from "@/components/Spinner";

export const Route = createFileRoute("/_authenticated/host/reports")({
  component: HostReportsPage,
});

interface ReportRow {
  id: string;
  target_type: "event" | "photo";
  target_id: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
}

interface Enriched extends ReportRow {
  title: string;
  hidden: boolean;
  eventId: string;
  photoPath?: string;
}

function publicPhotoUrl(path: string) {
  return supabase.storage.from("event-photos").getPublicUrl(path).data.publicUrl;
}

function HostReportsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Enriched[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: reports } = await supabase
      .from("content_reports")
      .select("id, target_type, target_id, reason, created_at, resolved_at")
      .order("created_at", { ascending: false });
    const list = (reports as ReportRow[]) ?? [];

    const eventIds = list.filter((r) => r.target_type === "event").map((r) => r.target_id);
    const photoIds = list.filter((r) => r.target_type === "photo").map((r) => r.target_id);

    const eventMap = new Map<string, { title: string; hidden: boolean }>();
    if (eventIds.length) {
      const { data } = await supabase
        .from("events")
        .select("id, title, hidden")
        .in("id", eventIds);
      (data ?? []).forEach((e) => eventMap.set(e.id, { title: e.title, hidden: e.hidden }));
    }

    const photoMap = new Map<
      string,
      { storage_path: string; hidden: boolean; event_id: string; eventTitle: string }
    >();
    if (photoIds.length) {
      const { data } = await supabase
        .from("event_photos")
        .select("id, storage_path, hidden, event_id, events:event_id(title)")
        .in("id", photoIds);
      (data ?? []).forEach((p: any) =>
        photoMap.set(p.id, {
          storage_path: p.storage_path,
          hidden: p.hidden,
          event_id: p.event_id,
          eventTitle: p.events?.title ?? "",
        }),
      );
    }

    const enriched: Enriched[] = list
      .map((r) => {
        if (r.target_type === "event") {
          const ev = eventMap.get(r.target_id);
          if (!ev) return null;
          return { ...r, title: ev.title, hidden: ev.hidden, eventId: r.target_id };
        }
        const ph = photoMap.get(r.target_id);
        if (!ph) return null;
        return {
          ...r,
          title: `Photo · ${ph.eventTitle}`,
          hidden: ph.hidden,
          eventId: ph.event_id,
          photoPath: ph.storage_path,
        };
      })
      .filter(Boolean) as Enriched[];

    setItems(enriched);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleHidden = async (r: Enriched, hide: boolean) => {
    const table = r.target_type === "event" ? "events" : "event_photos";
    const { error } = await supabase.from(table).update({ hidden: hide }).eq("id", r.target_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(hide ? "Hidden from public" : "Restored");
    load();
  };

  const resolve = async (r: Enriched) => {
    const { error } = await supabase
      .from("content_reports")
      .update({ resolved_at: new Date().toISOString(), resolved_by: user!.id })
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked resolved");
    load();
  };

  if (items === null) return <PageLoader />;

  const open = items.filter((r) => !r.resolved_at);
  const resolved = items.filter((r) => r.resolved_at);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">Moderation reports</h1>
          <p className="text-sm text-muted-foreground">Reports for events and photos you host.</p>
        </div>

        <Section title={`Open (${open.length})`} reports={open} onHide={toggleHidden} onResolve={resolve} />
        <Section title="Resolved" reports={resolved} onHide={toggleHidden} onResolve={resolve} />
      </div>
    </div>
  );
}

function Section({
  title,
  reports,
  onHide,
  onResolve,
}: {
  title: string;
  reports: Enriched[];
  onHide: (r: Enriched, hide: boolean) => void;
  onResolve: (r: Enriched) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-md border p-3">
              {r.photoPath && (
                <img
                  src={publicPhotoUrl(r.photoPath)}
                  alt=""
                  className="h-16 w-16 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">{r.target_type}</Badge>
                  {r.hidden && <Badge variant="destructive">Hidden</Badge>}
                  <span className="truncate text-sm font-medium">{r.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{r.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.target_type === "event" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/events/$eventId" params={{ eventId: r.eventId }}>View</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/events/$eventId/gallery" params={{ eventId: r.eventId }}>
                        View gallery
                      </Link>
                    </Button>
                  )}
                  {r.hidden ? (
                    <Button size="sm" variant="outline" onClick={() => onHide(r, false)}>
                      Restore
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => onHide(r, true)}>
                      Hide
                    </Button>
                  )}
                  {!r.resolved_at && (
                    <Button size="sm" onClick={() => onResolve(r)}>Mark resolved</Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
