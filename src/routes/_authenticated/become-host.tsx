import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/become-host")({
  component: BecomeHostPage,
});

function BecomeHostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRole(data?.role ?? null);
        setLoading(false);
      });
  }, [user]);

  const handleBecomeHost = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({ role: "host" })
      .eq("id", user.id)
      .eq("role", "attendee");
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("You're now a Host!");
    setRole("host");
    navigate({ to: "/account" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Become a Host</CardTitle>
          <CardDescription>
            Hosts can create and manage events. This action can only be done once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : role === "attendee" ? (
            <Button className="w-full" onClick={handleBecomeHost} disabled={submitting}>
              {submitting ? "Upgrading..." : "Become a Host"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your current role is <span className="font-medium text-foreground">{role}</span>. You can't register as a Host again.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
