import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { user, loading, signOut } = useAuth();
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsHost(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: own } = await supabase
        .from("hosts")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (own) {
        setIsHost(true);
        return;
      }
      const { data: m } = await supabase
        .from("host_members")
        .select("host_id")
        .eq("profile_id", user.id)
        .eq("role", "host")
        .maybeSingle();
      if (!cancelled) setIsHost(Boolean(m));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="font-semibold tracking-tight">
          Eventful
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link to="/explore">Explore</Link>
          </Button>
          {!loading && user && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/my-tickets">My Tickets</Link>
            </Button>
          )}
          {!loading && user && isHost && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/host/dashboard">Host Dashboard</Link>
            </Button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary"
              role="status"
              aria-label="Loading"
            />
          ) : user ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to="/account">My account</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ redirect: "/", mode: "signin" }}>Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ redirect: "/", mode: "signup" }}>Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
