import { AppShell } from "@/components/AppShell";

export const preferredRegion = "hnd1";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

