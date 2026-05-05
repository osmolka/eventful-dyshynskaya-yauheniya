import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/Spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const exploreSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  from: fallback(z.string(), "").default(""),
  to: fallback(z.string(), "").default(""),
  location: fallback(z.enum(["any", "venue", "online"]), "any").default("any"),
  includePast: fallback(z.boolean(), false).default(false),
});

type ExploreSearch = z.infer<typeof exploreSearchSchema>;

export const Route = createFileRoute("/explore")({
  validateSearch: zodValidator(exploreSearchSchema),
  component: ExplorePage,
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
}

function ExplorePage() {
  const { q, from, to, location, includePast } = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const [events, setEvents] = useState<EventRow[] | null>(null);

  // Local input for debounced text search
  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== q) navigate({ search: (p: ExploreSearch) => ({ ...p, q: qInput }) });
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, q, navigate]);

  useEffect(() => {
    (async () => {
      let query = supabase
        .from("events")
        .select(
          "id, title, description, start_at, end_at, time_zone, venue_address, online_link, cover_image_url",
        )
        .eq("status", "published")
        .eq("visibility", "public")
        .order("start_at", { ascending: true });

      if (q.trim()) {
        const term = `%${q.trim()}%`;
        query = query.or(`title.ilike.${term},description.ilike.${term}`);
      }
      if (from) query = query.gte("start_at", new Date(from).toISOString());
      if (to) query = query.lte("start_at", new Date(to).toISOString());
      if (location === "venue") query = query.not("venue_address", "is", null);
      if (location === "online") query = query.not("online_link", "is", null);
      if (!includePast) query = query.gte("end_at", new Date().toISOString());

      const { data } = await query;
      setEvents(data ?? []);
    })();
  }, [q, from, to, location, includePast]);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Explore events</h1>
          <p className="text-sm text-muted-foreground">
            Discover upcoming public events from our hosts.
          </p>
        </header>

        <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              placeholder="Title or description"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => navigate({ search: (p: ExploreSearch) => ({ ...p, from: e.target.value }) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => navigate({ search: (p: ExploreSearch) => ({ ...p, to: e.target.value }) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={location}
              onValueChange={(v) =>
                navigate({ search: (p: ExploreSearch) => ({ ...p, location: v as "any" | "venue" | "online" }) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="venue">In person</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
            <Switch
              id="past"
              checked={includePast}
              onCheckedChange={(c) => navigate({ search: (p: ExploreSearch) => ({ ...p, includePast: c }) })}
            />
            <Label htmlFor="past" className="font-normal">Include past events</Label>
          </div>
        </div>

        {events === null ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events match your filters.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((e) => (
              <Card
                key={e.id}
                className="h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                onClick={() => navigate({ to: "/events/$eventId", params: { eventId: e.id } })}
              >
                {e.cover_image_url && (
                  <img
                    src={e.cover_image_url}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{e.title}</CardTitle>
                  <CardDescription>
                    {new Date(e.start_at).toLocaleString()} · {e.online_link ? "Online" : e.venue_address}
                  </CardDescription>
                </CardHeader>
                {e.description && (
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
