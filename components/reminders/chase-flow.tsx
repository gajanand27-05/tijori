"use client";

import { useState } from "react";
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
}: {
  customerIds: string[];
  open: boolean;
  onClose: () => void;
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
        {open && <ChaseSteps customerIds={customerIds} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ChaseSteps({
  customerIds,
  onClose,
}: {
  customerIds: string[];
  onClose: () => void;
}) {
  const data = useTijoriData();
  const [index, setIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const total = customerIds.length;

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
          setSentCount((c) => c + 1);
          setIndex((i) => i + 1);
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
