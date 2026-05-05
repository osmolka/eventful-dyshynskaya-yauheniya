import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Eventful" },
      { name: "description", content: "Event hosting and attendance platform — a tool for running free community-style events end to end. It lets organizers publish an event page and share it publicl" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Eventful" },
      { property: "og:description", content: "Event hosting and attendance platform — a tool for running free community-style events end to end. It lets organizers publish an event page and share it publicl" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Eventful" },
      { name: "twitter:description", content: "Event hosting and attendance platform — a tool for running free community-style events end to end. It lets organizers publish an event page and share it publicl" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cbdeec87-4473-4bb0-adf4-1c80d99ec8c7/id-preview-979b7597--433224d8-bdf9-482a-bb7c-05a749fc5610.lovable.app-1777987965891.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cbdeec87-4473-4bb0-adf4-1c80d99ec8c7/id-preview-979b7597--433224d8-bdf9-482a-bb7c-05a749fc5610.lovable.app-1777987965891.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <AppHeader />
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
