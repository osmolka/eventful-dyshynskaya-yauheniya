import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { PageLoader } from "@/components/Spinner";

export const Route = createFileRoute("/_authenticated/events/new")({
  component: NewEventPage,
});

function NewEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hostId, setHostId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [timeZone, setTimeZone] = useState(browserTz);
  const [locationKind, setLocationKind] = useState<"venue" | "online">("venue");
  const [venueAddress, setVenueAddress] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: host }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase.from("hosts").select("id").eq("profile_id", user.id).maybeSingle(),
      ]);
      setRole(profile?.role ?? null);
      setHostId(host?.id ?? null);
      setLoading(false);
    })();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !hostId) return;
    setSubmitting(true);

    try {
      let coverUrl: string | null = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/cover-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("event-covers")
          .upload(path, coverFile, { upsert: true });
        if (uploadError) throw uploadError;
        coverUrl = supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
      }

      const { data, error } = await supabase
        .from("events")
        .insert({
          host_id: hostId,
          title,
          description: description || null,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          time_zone: timeZone,
          venue_address: locationKind === "venue" ? venueAddress : null,
          online_link: locationKind === "online" ? onlineLink : null,
          capacity,
          cover_image_url: coverUrl,
          visibility,
        })
        .select("id")
        .single();
      if (error) throw error;

      toast.success("Event draft created");
      navigate({ to: "/my-events" });
      void data;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLoader />
    );
  }

  if (role !== "host" || !hostId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Hosts only</CardTitle>
            <CardDescription>You need a Host profile to create events.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/become-host">Become a Host</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>New event</CardTitle>
            <CardDescription>Saved as a draft. You can publish it later.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
              </Field>

              <Field label="Description">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Starts">
                  <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
                </Field>
                <Field label="Ends">
                  <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
                </Field>
              </div>

              <Field label="Time zone">
                <Input value={timeZone} onChange={(e) => setTimeZone(e.target.value)} required />
              </Field>

              <div className="space-y-3">
                <Label>Location</Label>
                <RadioGroup
                  value={locationKind}
                  onValueChange={(v) => setLocationKind(v as "venue" | "online")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="venue" id="venue" />
                    <Label htmlFor="venue" className="font-normal">In person</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="font-normal">Online</Label>
                  </div>
                </RadioGroup>
                {locationKind === "venue" ? (
                  <Input
                    placeholder="Venue address"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    required
                  />
                ) : (
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={onlineLink}
                    onChange={(e) => setOnlineLink(e.target.value)}
                    required
                  />
                )}
              </div>

              <Field label="Capacity">
                <Input
                  type="number"
                  min={0}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                />
              </Field>

              <div className="space-y-3">
                <Label>Pricing</Label>
                <TooltipProvider>
                  <RadioGroup value="free" className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="free" id="price-free" />
                      <Label htmlFor="price-free" className="font-normal">Free</Label>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex cursor-not-allowed items-center gap-2 opacity-50">
                          <RadioGroupItem value="paid" id="price-paid" disabled />
                          <Label htmlFor="price-paid" className="font-normal">Paid</Label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Coming soon</TooltipContent>
                    </Tooltip>
                  </RadioGroup>
                </TooltipProvider>
              </div>

              <Field label="Cover image">
                <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              </Field>

              <div className="space-y-3">
                <Label>Visibility</Label>
                <RadioGroup
                  value={visibility}
                  onValueChange={(v) => setVisibility(v as "public" | "unlisted")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="public" id="vis-public" />
                    <Label htmlFor="vis-public" className="font-normal">Public</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="unlisted" id="vis-unlisted" />
                    <Label htmlFor="vis-unlisted" className="font-normal">Unlisted (link only)</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Only Published events are visible to others. Unlisted events require the direct link.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : "Create draft"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
