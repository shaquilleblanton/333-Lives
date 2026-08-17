import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorRetryViewProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/**
 * Shared full-screen error state with optional retry button.
 * Drop-in replacement for inline isError blocks across web screens.
 */
export function ErrorRetryView({
  title = "Something went wrong",
  description = "We couldn't load this page. Check your connection and try again.",
  onRetry,
  isRetrying = false,
  className,
}: ErrorRetryViewProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 px-6 text-center",
        className,
      )}
    >
      <h2 className="font-serif text-xl text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-md">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")} />
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Inline/compact error state used inside sections (tabs, sub-panels).
 */
export function ErrorRetryInline({
  message = "Couldn't load this section.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 py-10 text-center", className)}>
      <p className="text-muted-foreground text-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-primary hover:underline font-subheading">
          Try again
        </button>
      )}
    </div>
  );
}
