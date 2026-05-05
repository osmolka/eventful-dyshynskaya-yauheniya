import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PageLoader } from "@/components/Spinner";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/invites/$token")({
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const accept = async () => {
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_host_invite", { _token: token });
    setAccepting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Invite accepted");
    setDone(data as string);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/invites/${token}` } });
    }
  }, [user, loading, navigate, token]);

  if (loading || !user) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="mx-auto max-w-md space-y-3">
        <BackButton />
      <Card>
        <CardHeader>
          <CardTitle>Host invite</CardTitle>
          <CardDescription>
            Accept this invite to join a Host team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {done ? (
            <Button asChild className="w-full">
              <Link to="/hosts/$hostId" params={{ hostId: done }}>Go to Host page</Link>
            </Button>
          ) : (
            <Button onClick={accept} disabled={accepting} className="w-full">
              {accepting ? "Accepting..." : "Accept invite"}
            </Button>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
