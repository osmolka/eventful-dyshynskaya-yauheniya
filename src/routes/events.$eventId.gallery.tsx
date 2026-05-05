import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$eventId/gallery")({
  component: GalleryPage,
});

interface PhotoRow {
  id: string;
  storage_path: string;
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  uploader_id: string;
}

interface EventInfo {
  id: string;
  title: string;
  status: string;
}

function publicUrl(path: string) {
  return supabase.storage.from("event-photos").getPublicUrl(path).data.publicUrl;
}

function GalleryPage() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventInfo | null | undefined>(undefined);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [myPhotos, setMyPhotos] = useState<PhotoRow[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const { data: ev } = await supabase
      .from("events")
      .select("id, title, status")
      .eq("id", eventId)
      .maybeSingle();
    setEvent(ev ?? null);

    const { data: approved } = await supabase
      .from("event_photos")
      .select("id, storage_path, caption, status, uploader_id")
      .eq("event_id", eventId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    setPhotos((approved as PhotoRow[]) ?? []);

    if (user) {
      const { data: mine } = await supabase
        .from("event_photos")
        .select("id, storage_path, caption, status, uploader_id")
        .eq("event_id", eventId)
        .eq("uploader_id", user.id)
        .order("created_at", { ascending: false });
      setMyPhotos((mine as PhotoRow[]) ?? []);

      const { data: rsvp } = await supabase
        .from("rsvps")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .maybeSingle();
      setCanUpload(!!rsvp);
    }
  }, [eventId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${eventId}/${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("event-photos")
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { error: dbErr } = await supabase.from("event_photos").insert({
      event_id: eventId,
      uploader_id: user.id,
      storage_path: path,
      caption: caption || null,
      status: "pending",
    });
    setUploading(false);
    if (dbErr) {
      toast.error(dbErr.message);
      return;
    }
    toast.success("Photo submitted for review");
    setCaption("");
    setFile(null);
    load();
  };

  if (event === undefined) return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;
  if (event === null || event.status !== "published")
    return <div className="p-10 text-sm text-muted-foreground">Event not found.</div>;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{event.title} — Photos</h1>
            <p className="text-sm text-muted-foreground">
              <Link to="/events/$eventId" params={{ eventId }} className="underline">
                Back to event
              </Link>
            </p>
          </div>
        </div>

        {user && canUpload && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload a photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Input
                placeholder="Caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? "Uploading..." : "Submit for review"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Photos are hidden until a host approves them.
              </p>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Gallery</h2>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {photos.map((p) => (
                <figure key={p.id} className="space-y-1">
                  <img
                    src={publicUrl(p.storage_path)}
                    alt={p.caption ?? ""}
                    className="aspect-square w-full rounded-md object-cover"
                    loading="lazy"
                  />
                  {p.caption && <figcaption className="text-xs text-muted-foreground">{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </section>

        {user && myPhotos.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">My submissions</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {myPhotos.map((p) => (
                <figure key={p.id} className="space-y-1">
                  <img
                    src={publicUrl(p.storage_path)}
                    alt=""
                    className="aspect-square w-full rounded-md object-cover"
                    loading="lazy"
                  />
                  <figcaption className="text-xs capitalize text-muted-foreground">{p.status}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
