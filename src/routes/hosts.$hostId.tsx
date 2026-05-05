import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Host {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  contact_email: string;
}

export const Route = createFileRoute("/hosts/$hostId")({
  component: HostPage,
});

function HostPage() {
  const { hostId } = Route.useParams();
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("hosts")
      .select("id, name, logo_url, bio, contact_email")
      .eq("id", hostId)
      .maybeSingle()
      .then(({ data }) => {
        setHost(data);
        setLoading(false);
      });
  }, [hostId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!host) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <h1 className="text-xl font-semibold">Host not found</h1>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {host.logo_url && <AvatarImage src={host.logo_url} alt={host.name} />}
            <AvatarFallback>{host.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{host.name}</h1>
            <a
              href={`mailto:${host.contact_email}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {host.contact_email}
            </a>
          </div>
        </header>

        {host.bio && (
          <p className="text-base leading-relaxed text-foreground/90">{host.bio}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No published events yet.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
