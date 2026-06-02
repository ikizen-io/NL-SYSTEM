import { AppShell } from "@/components/AppShell";
import { getDatabaseMode } from "@/lib/runtime";

export const preferredRegion = "hnd1";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const databaseMode = getDatabaseMode();
  return <AppShell databaseMode={databaseMode}>{children}</AppShell>;
}

