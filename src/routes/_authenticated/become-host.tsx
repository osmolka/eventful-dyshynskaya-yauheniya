import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Spinner } from "@/components/Spinner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/become-host")({
  component: BecomeHostPage,
});

function BecomeHostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [hasHost, setHasHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: host }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase.from("hosts").select("id").eq("profile_id", user.id).maybeSingle(),
      ]);
      setRole(profile?.role ?? null);
      setHasHost(!!host);
      setContactEmail(user.email ?? "");
      setLoading(false);
    })();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      let logoUrl: string | null = null;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop() ?? "png";
        const path = `${user.id}/logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("host-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        logoUrl = supabase.storage.from("host-logos").getPublicUrl(path).data.publicUrl;
      }

      const { error: insertError } = await supabase.from("hosts").insert({
        profile_id: user.id,
        name,
        bio,
        contact_email: contactEmail,
        logo_url: logoUrl,
      });
      if (insertError) throw insertError;

      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: "host" })
        .eq("id", user.id)
        .eq("role", "attendee");
      if (roleError) throw roleError;

      toast.success("You're now a Host!");
      const { data: created } = await supabase
        .from("hosts")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (created?.id) navigate({ to: "/hosts/$hostId", params: { hostId: created.id } });
      else navigate({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Become a Host</CardTitle>
          <CardDescription>
            Set up your Host profile. You can only register once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
          ) : hasHost || role !== "attendee" ? (
            <p className="text-sm text-muted-foreground">
              You're already registered as a Host (or not eligible).
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Host name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Short bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Contact email</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create Host profile"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
