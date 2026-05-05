import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/events/$eventId/feedback-summary")({
  component: SummaryPage,
});

interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
}

function SummaryPage() {
  const { eventId } = Route.useParams();
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [title, setTitle] = useState("Event");
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

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
      setTitle(ev.title);
      const { data: ok } = await supabase.rpc("is_host_role", { _host_id: ev.host_id });
      if (!ok) {
        setAllowed(false);
        return;
      }
      setAllowed(true);

      const { data: fb } = await supabase
        .from("event_feedback")
        .select("id, rating, comment, created_at, user_id")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      const list = (fb ?? []) as FeedbackRow[];
      setRows(list);

      const userIds = Array.from(new Set(list.map((r) => r.user_id)));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        const map: Record<string, string> = {};
        (profiles ?? []).forEach((p) => {
          map[p.id] = p.display_name ?? "Anonymous";
        });
        setNames(map);
      }
    })();
  }, [eventId, user, loading]);

  if (loading || allowed === null) {
    return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;
  }
  if (!allowed) {
    return (
      <div className="p-10 text-sm text-muted-foreground">
        Only Hosts can view event feedback.
      </div>
    );
  }

  const count = rows.length;
  const avg = count > 0 ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [1, 2, 3, 4, 5].map((n) => ({
    n,
    count: rows.filter((r) => r.rating === n).length,
  }));

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <BackButton />
        <header>
          <p className="text-sm text-muted-foreground">Feedback</p>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Average rating</CardDescription>
              <CardTitle className="text-3xl">
                {count > 0 ? `${avg.toFixed(1)} ★` : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Responses</CardDescription>
              <CardTitle className="text-3xl">{count}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dist
              .slice()
              .reverse()
              .map((d) => {
                const pct = count > 0 ? (d.count / count) * 100 : 0;
                return (
                  <div key={d.n} className="flex items-center gap-3 text-sm">
                    <span className="w-8 text-muted-foreground">{d.n}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right tabular-nums text-muted-foreground">
                      {d.count}
                    </span>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments</CardTitle>
            <CardDescription>{count === 0 ? "No feedback yet." : `${count} response${count === 1 ? "" : "s"}.`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows
              .filter((r) => r.comment && r.comment.trim().length > 0)
              .map((r) => (
                <div key={r.id} className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{names[r.user_id] ?? "Anonymous"}</span>
                    <span className="text-muted-foreground">{r.rating}★</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {r.comment}
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
