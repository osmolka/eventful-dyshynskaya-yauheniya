import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/Spinner";
import { Calendar, Ticket, QrCode, Megaphone } from "lucide-react";
import heroImage from "@/assets/hero-events.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt="People gathered at an outdoor community event under string lights"
          width={1920}
          height={1080}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/70 to-background" />

        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center sm:py-32 lg:py-40">
          <span className="mb-4 inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur">
            Eventful — gather your community
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Discover events. Host your own.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Find local meetups, talks, and gatherings near you — or create your
            own and bring people together with RSVPs, tickets, and check-in built in.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/explore">Explore events</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={user ? "/become-host" : "/auth"}>Become a host</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Two simple flows — for the people who show up, and the people who make it happen.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-lg font-semibold">For attendees</h3>
            <ul className="mt-4 space-y-4 text-sm">
              <Step icon={<Calendar className="h-5 w-5" />} title="Browse events">
                Filter by date, location, or format and find what's happening.
              </Step>
              <Step icon={<Ticket className="h-5 w-5" />} title="RSVP in one tap">
                Reserve your spot — or join the waitlist if it's full.
              </Step>
              <Step icon={<QrCode className="h-5 w-5" />} title="Show your ticket">
                Get a QR code, add it to your calendar, and check in on arrival.
              </Step>
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-lg font-semibold">For hosts</h3>
            <ul className="mt-4 space-y-4 text-sm">
              <Step icon={<Megaphone className="h-5 w-5" />} title="Create an event">
                Add details, capacity, and a cover image — publish in minutes.
              </Step>
              <Step icon={<Ticket className="h-5 w-5" />} title="Manage RSVPs">
                Track who's coming, run a waitlist, and export attendee lists.
              </Step>
              <Step icon={<QrCode className="h-5 w-5" />} title="Check people in">
                Scan tickets at the door and see live attendance counters.
              </Step>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/explore">Find an event</Link>
          </Button>
          {!user && (
            <Button asChild variant="outline">
              <Link to="/auth">Sign up free</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}

function Step({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}
