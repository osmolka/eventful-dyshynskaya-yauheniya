import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, signOut } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setRole(data?.role ?? null));
  }, [user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>You are signed in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Role: </span>
            <span className="font-medium">{role ?? "—"}</span>
          </div>
          {role === "attendee" && (
            <Button asChild className="w-full">
              <Link to="/become-host">Become a Host</Link>
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => signOut()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
