"use client";

import { Button } from "@/components/ui/button";
import { resetDemoData } from "@/lib/store";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  function handleResetDemo() {
    try {
      resetDemoData();
      reset();
    } catch {
      // If the reset fails, keep the error screen up instead of throwing again.
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        Something went wrong. Your data is safe on this phone.
      </h2>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          size="lg"
          className="min-h-11 w-full"
          onClick={() => reset()}
        >
          Try again
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="min-h-11 w-full"
          onClick={handleResetDemo}
        >
          Reset demo data
        </Button>
      </div>
    </div>
  );
}
