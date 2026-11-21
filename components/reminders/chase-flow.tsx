"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTijoriData } from "@/lib/use-tijori-data";
import type { Customer } from "@/lib/types";
import { ReminderDraft } from "./remind-dialog";

const FULL_WIDTH_BUTTON = "h-11 min-h-[44px] w-full sm:w-auto";

export function ChaseFlow({
  customerIds,
  open,
  onClose,
  onProgress,
}: {
  customerIds: string[];
  open: boolean;
  onClose: () => void;
  onProgress?: (doneCount: number, total: number) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chase customers</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so index and sentCount reset on each open. */}
        {open && (
          <ChaseSteps
            customerIds={customerIds}
            onClose={onClose}
            onProgress={onProgress}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChaseSteps({
  customerIds,
  onClose,
  onProgress,
}: {
  customerIds: string[];
  onClose: () => void;
  onProgress?: (doneCount: number, total: number) => void;
}) {
  const data = useTijoriData();
  const [index, setIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const total = customerIds.length;

  // Keep the latest callback in a ref so the open-time call never goes stale.
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  });

  // Report the starting progress once on open (ChaseSteps mounts only while open).
  useEffect(() => {
    onProgressRef.current?.(0, total);
  }, [total]);

  if (index >= total) {
    return (
      <>
        <p className="text-sm">Done: {sentCount} reminders sent</p>
        <DialogFooter>
          <Button
            variant="default"
            className={FULL_WIDTH_BUTTON}
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  const currentId = customerIds[index];
  const name =
    data.customers.find((c: Customer) => c.id === currentId)?.name ?? "";

  return (
    <>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {index + 1} of {total}
        </p>
        <p className="text-base font-medium">{name}</p>
      </div>
      <ReminderDraft
        key={currentId}
        customerId={currentId}
        sendLabel="Send & next"
        onSent={() => {
          // Only "Send & next" reaches here; Skip does not count.
          const nextCount = sentCount + 1;
          setSentCount(nextCount);
          setIndex((i) => i + 1);
          onProgressRef.current?.(nextCount, total);
        }}
      />
      <DialogFooter>
        <Button
          variant="outline"
          className={FULL_WIDTH_BUTTON}
          onClick={() => setIndex((i) => i + 1)}
        >
          Skip
        </Button>
      </DialogFooter>
    </>
  );
}
