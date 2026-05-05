import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary",
        className,
      )}
    />
  );
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner label={label} className="h-8 w-8" />
    </div>
  );
}
