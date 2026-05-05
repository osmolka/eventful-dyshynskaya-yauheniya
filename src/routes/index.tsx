import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
        <p className="max-w-md text-muted-foreground">
          This is a public page. Anyone can view it. Sign in to access your account.
        </p>
      </div>
      <div className="flex gap-3">
        {loading ? null : user ? (
          <>
            <Button asChild>
              <Link to="/account">My account</Link>
            </Button>
            <Button variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
          </>
        ) : (
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
