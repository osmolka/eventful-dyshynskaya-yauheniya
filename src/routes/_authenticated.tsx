import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/Spinner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <PageLoader />
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <Outlet />;
}
