export type DatabaseMode = {
  kind: "sqlite" | "postgres";
  label: string;
  shortLabel: string;
  backupHint: string;
};

export function isSqliteDatabase() {
  return (process.env.DATABASE_URL ?? "").startsWith("file:");
}

export function getDatabaseMode(): DatabaseMode {
  if (isSqliteDatabase()) {
    return {
      kind: "sqlite",
      label: "Local development · SQLite",
      shortLabel: "Local · SQLite",
      backupHint:
        "Local file database. Use Download/Save below for dev backups.",
    };
  }
  return {
    kind: "postgres",
    label: "Production · Supabase Postgres",
    shortLabel: "Supabase Postgres",
    backupHint:
      "Hosted Postgres. Use Supabase dashboard backups plus CSV exports below.",
  };
}
