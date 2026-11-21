"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTijoriData } from "@/lib/use-tijori-data";
import { resetDemoData, updateBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Draft = {
  name: string;
  ownerName: string;
  city: string;
  cashInHand: string;
  safetyBuffer: string;
  defaultDueDays: string;
  upiId: string;
};

export default function SettingsPage() {
  const { business } = useTijoriData();
  const [draft, setDraft] = useState<Draft>({
    name: business.name,
    ownerName: business.ownerName,
    city: business.city,
    cashInHand: String(business.cashInHand),
    safetyBuffer: String(business.safetyBuffer),
    defaultDueDays: String(business.defaultDueDays),
    upiId: business.upiId ?? "",
  });
  const [resetOpen, setResetOpen] = useState(false);

  // The store hydrates after the first render, so re-sync the form when the business data changes.
  useEffect(() => {
    setDraft({
      name: business.name,
      ownerName: business.ownerName,
      city: business.city,
      cashInHand: String(business.cashInHand),
      safetyBuffer: String(business.safetyBuffer),
      defaultDueDays: String(business.defaultDueDays),
      upiId: business.upiId ?? "",
    });
  }, [business]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateBusiness({
      name: draft.name.trim(),
      ownerName: draft.ownerName.trim(),
      city: draft.city.trim(),
      cashInHand: Number(draft.cashInHand) || 0,
      safetyBuffer: Number(draft.safetyBuffer) || 0,
      defaultDueDays: Number(draft.defaultDueDays) || 0,
      upiId: draft.upiId.trim(),
    });
    toast.success("Settings saved");
  }

  function handleReset() {
    resetDemoData();
    setResetOpen(false);
    toast.success("Demo data reset");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-zinc-900">Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Business</CardTitle>
            <CardDescription>How your business appears across Tijori.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Business name</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ownerName">Owner name</Label>
              <Input
                id="ownerName"
                value={draft.ownerName}
                onChange={(e) => update("ownerName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={draft.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                value={draft.upiId}
                placeholder="yourname@upi"
                onChange={(e) => update("upiId", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Cash and dues</CardTitle>
            <CardDescription>Used for forecasts and payment reminders.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="cashInHand">Cash in hand (₹)</Label>
              <Input
                id="cashInHand"
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.cashInHand}
                onChange={(e) => update("cashInHand", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="safetyBuffer">Safety buffer (₹)</Label>
              <Input
                id="safetyBuffer"
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.safetyBuffer}
                onChange={(e) => update("safetyBuffer", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultDueDays">Due days</Label>
              <Input
                id="defaultDueDays"
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.defaultDueDays}
                onChange={(e) => update("defaultDueDays", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="h-12 rounded-xl px-8">
            Save
          </Button>
        </div>
      </form>

      <Card className="rounded-2xl border-destructive/30">
        <CardHeader>
          <CardTitle>Demo data</CardTitle>
          <CardDescription>
            Restore the sample customers, invoices and bills. Your changes will be lost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger render={<Button variant="outline" className="h-11 rounded-xl" />}>
              Reset demo data
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Reset demo data?</DialogTitle>
                <DialogDescription>
                  This replaces all current data with the sample data. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button variant="destructive" onClick={handleReset}>
                  Reset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
