import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$eventId/photos")({
  component: PhotoModerationPage,
});

interface PhotoRow {
  id: string;
  storage_path: string;
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  uploader_id: string;
  created_at: string;
}

function publicUrl(path: string) {
  return supabase.storage.from("event-photos").getPublicUrl(path).data.publicUrl;
}

function PhotoModerationPage() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [eventTitle, setEventTitle] = useState<string>("");

  const load = useCallback(async () => {
    if (!user) return;
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
    if (!ok) {
      setAllowed(false);
      return;
    }
    setAllowed(true);
    const { data } = await supabase
      .from("event_photos")
      .select("id, storage_path, caption, status, uploader_id, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    setPhotos((data as PhotoRow[]) ?? []);
  }, [eventId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("event_photos")
      .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Approved" : "Rejected");
    load();
  };

  if (allowed === null) return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;
  if (!allowed) return <div className="p-10 text-sm text-muted-foreground">Access denied.</div>;

  const pending = photos.filter((p) => p.status === "pending");
  const reviewed = photos.filter((p) => p.status !== "pending");

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{eventTitle} — Photo moderation</h1>
          <p className="text-sm text-muted-foreground">
            <Link to="/events/$eventId/gallery" params={{ eventId }} className="underline">
              View public gallery
            </Link>
          </p>
        </div>

        <Section title={`Pending (${pending.length})`} photos={pending} renderActions={(p) => (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => moderate(p.id, "approved")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => moderate(p.id, "rejected")}>Reject</Button>
          </div>
        )} />

        <Section title="Reviewed" photos={reviewed} renderActions={(p) => (
          <div className="flex items-center gap-2">
            <span className="text-xs capitalize text-muted-foreground">{p.status}</span>
            {p.status === "rejected" && (
              <Button size="sm" variant="outline" onClick={() => moderate(p.id, "approved")}>Approve</Button>
            )}
            {p.status === "approved" && (
              <Button size="sm" variant="outline" onClick={() => moderate(p.id, "rejected")}>Reject</Button>
            )}
          </div>
        )} />
      </div>
    </div>
  );
}

function Section({
  title,
  photos,
  renderActions,
}: {
  title: string;
  photos: PhotoRow[];
  renderActions: (p: PhotoRow) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="space-y-2 rounded-md border p-2">
                <img
                  src={publicUrl(p.storage_path)}
                  alt=""
                  className="aspect-square w-full rounded object-cover"
                  loading="lazy"
                />
                {p.caption && <p className="text-xs text-muted-foreground">{p.caption}</p>}
                {renderActions(p)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
