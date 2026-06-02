"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  CreditCard,
  Database,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Receipt,
  Upload,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavigationProgress } from "@/components/NavigationProgress";
import type { DatabaseMode } from "@/lib/runtime";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/backup", label: "Backup", icon: Database },
] as const;

const quickActions = [
  { href: "/sales", label: "New invoice", icon: Receipt },
  { href: "/inventory/receive", label: "Receive stock", icon: PackagePlus },
] as const;

export function AppShell({
  children,
  databaseMode,
}: {
  children: React.ReactNode;
  databaseMode: DatabaseMode;
}) {
  const pathname = usePathname();
  const active = navItems.find(
    (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`),
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff_0,#f7f7f8_34rem,#f4f4f5_100%)] text-zinc-950">
      <NavigationProgress />
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-56 shrink-0 border-r border-zinc-200/80 bg-white/90 px-3 py-4 shadow-[1px_0_0_rgba(24,24,27,0.02)] backdrop-blur md:flex md:flex-col">
          <Link prefetch={false}
            href="/dashboard"
            className="mb-5 flex items-center gap-2.5 rounded-xl px-1 py-1"
          >
            <Image
              src="/nitro-labs-logo.svg"
              alt="Nitro Labs"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-zinc-950">
                Nitro Labs
              </div>
              <div className="truncate text-[11px] text-zinc-500">
                Sportswear ERP
              </div>
            </div>
          </Link>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link prefetch={false}
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all",
                    isActive
                      ? "bg-zinc-950 text-white shadow-[0_1px_1px_rgba(24,24,27,0.08)]"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-700",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-2">
            <div className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Quick actions
            </div>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link prefetch={false}
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-white hover:text-zinc-950 hover:shadow-sm"
                  >
                    <Icon className="h-3.5 w-3.5 text-zinc-400" />
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-auto border-t border-zinc-100 pt-3">
            <div
              className="mb-1.5 text-[11px] text-zinc-400"
              title={databaseMode.backupHint}
            >
              {databaseMode.shortLabel}
            </div>
            <a
              href="/api/auth/logout"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </a>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="md:hidden"
                    >
                      <Menu className="h-4 w-4" />
                      <span className="sr-only">Open navigation</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link prefetch={false} href={item.href}>
                            <Icon className="h-4 w-4 text-zinc-400" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-500">
                  <Image
                    src="/nitro-labs-logo.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0 object-contain md:hidden"
                    aria-hidden
                  />
                  <Link prefetch={false} href="/dashboard" className="font-medium text-zinc-800 hover:text-zinc-950">
                    Nitro Labs
                  </Link>
                  {active ? (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                      <span className="truncate">{active.label}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.href}
                      asChild
                      variant={action.href === "/sales" ? "primary" : "outline"}
                      size="sm"
                    >
                      <Link prefetch={false} href={action.href}>
                        <Icon className="h-3.5 w-3.5" />
                        {action.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6">
            <div className="mx-auto w-full max-w-[1540px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
