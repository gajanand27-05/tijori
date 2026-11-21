"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Home,
  MoreHorizontal,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useTijoriData } from "@/lib/use-tijori-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const primaryNav: NavItem[] = [
  { href: "/app", label: "Today", icon: Home },
  { href: "/app/dues", label: "Dues", icon: Wallet },
  { href: "/app/invoices", label: "Invoices", icon: FileText },
  { href: "/app/forecast", label: "Forecast", icon: TrendingUp },
];

const moreNav: NavItem[] = [
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/bills", label: "Bills", icon: Receipt },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const sidebarNav: NavItem[] = [...primaryNav, ...moreNav];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { business } = useTijoriData();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreNav.some((item) => isActive(pathname, item.href));

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-2 border-r bg-card p-6 md:flex">
        <div className="mb-6 text-2xl font-semibold text-primary">Tijori</div>
        <nav className="flex flex-col gap-1">
          {sidebarNav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b bg-background/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate text-lg font-semibold text-zinc-900">
                {business.name}
              </span>
              <Badge variant="secondary" className="shrink-0 rounded-full">
                Demo data
              </Badge>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-5xl space-y-8">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card md:hidden">
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {primaryNav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                    active ? "text-primary" : "text-zinc-500"
                  }`}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger
                render={
                  <button
                    type="button"
                    aria-current={moreActive ? "page" : undefined}
                    className={`flex w-full flex-col items-center gap-1 py-3 text-xs font-medium ${
                      moreActive ? "text-primary" : "text-zinc-500"
                    }`}
                  />
                }
              >
                <MoreHorizontal className="size-5" />
                More
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl pb-8">
                <SheetHeader>
                  <SheetTitle>More</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 px-4">
                  {moreNav.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.href}
                        render={<Link href={item.href} aria-current={active ? "page" : undefined} />}
                        variant={active ? "secondary" : "ghost"}
                        className="h-12 justify-start gap-3 rounded-xl text-base"
                        onClick={() => setMoreOpen(false)}
                      >
                        <Icon className="size-5" />
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>
    </div>
  );
}
