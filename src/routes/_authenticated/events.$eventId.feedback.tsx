import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$eventId/feedback")({
  component: FeedbackPage,
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
});

interface EventInfo {
  id: string;
  title: string;
  end_at: string;
}

function FeedbackPage() {
  const { eventId } = Route.useParams();
  const { user, loading } = useAuth();
  const [event, setEvent] = useState<EventInfo | null | undefined>(undefined);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [existingId, setExistingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id, title, end_at")
        .eq("id", eventId)
        .maybeSingle();
      setEvent(ev ?? null);

      const { data: rsvp } = await supabase
        .from("rsvps")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .maybeSingle();
      setConfirmed(Boolean(rsvp));

      const { data: existing } = await supabase
        .from("event_feedback")
        .select("id, rating, comment")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        setExistingId(existing.id);
        setRating(existing.rating);
        setComment(existing.comment ?? "");
      }
    })();
  }, [eventId, user, loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = feedbackSchema.safeParse({
      rating,
      comment: comment.trim() || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const payload = {
      event_id: eventId,
      user_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    };
    const { data, error } = await supabase
      .from("event_feedback")
      .upsert(payload, { onConflict: "event_id,user_id" })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setExistingId(data.id);
    toast.success("Thanks for your feedback!");
  };

  if (loading || event === undefined || confirmed === null) {
    return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;
  }
  if (!event) {
    return <div className="p-10 text-sm text-muted-foreground">Event not found.</div>;
  }
  const ended = new Date(event.end_at) <= new Date();
  if (!ended) {
    return (
      <Wrapper title={event.title}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Feedback opens after the event</CardTitle>
            <CardDescription>
              Available after {new Date(event.end_at).toLocaleString()}.
            </CardDescription>
          </CardHeader>
        </Card>
      </Wrapper>
    );
  }
  if (!confirmed) {
    return (
      <Wrapper title={event.title}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Only attendees can leave feedback</CardTitle>
            <CardDescription>You need a confirmed RSVP to share feedback.</CardDescription>
          </CardHeader>
        </Card>
      </Wrapper>
    );
  }

  return (
    <Wrapper title={event.title}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {existingId ? "Edit your feedback" : "Share your feedback"}
          </CardTitle>
          <CardDescription>Help the host improve future events.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="What did you think?"
              />
            </div>
            <Button type="submit" disabled={submitting || rating < 1}>
              {submitting ? "Saving..." : existingId ? "Update feedback" : "Submit feedback"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Wrapper>
  );
}

function Wrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <BackButton />
        <header>
          <p className="text-sm text-muted-foreground">Feedback</p>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <Link
            to="/my-tickets"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← My tickets
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-3xl leading-none transition-colors ${
            n <= value ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
          }`}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
