import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const sqlitePath = process.argv[2] ?? "prisma/dev.db";
const replace = process.argv.includes("--replace");
const confirmReplace = process.argv.includes("--confirm-replace");
const prisma = new PrismaClient();

function printUsage() {
  console.log(`Usage:
  node scripts/import-sqlite-dev-db.mjs [path/to/dev.db]
  node scripts/import-sqlite-dev-db.mjs [path/to/dev.db] --replace --confirm-replace

Imports a legacy SQLite dev.db snapshot into the database configured by DATABASE_URL.

Safety:
  - Without --replace, the script refuses to run if the target database has rows.
  - --replace deletes all supported app tables before import.
  - --replace must be paired with --confirm-replace to prevent accidental wipes.`);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printUsage();
  process.exit(0);
}

if (replace && !confirmReplace) {
  console.error(
    "Refusing destructive import. Re-run with --replace --confirm-replace if you really want to wipe target rows first.",
  );
  process.exit(1);
}

const tableOrder = [
  "Product",
  "Customer",
  "Supplier",
  "Variant",
  "Invoice",
  "StockIn",
  "StockAdjustment",
  "Expense",
  "Counter",
  "InvoiceItem",
  "Payment",
  "ReturnRecord",
  "ReturnItem",
  "ExchangeItem",
];

const modelByTable = {
  Product: prisma.product,
  Customer: prisma.customer,
  Supplier: prisma.supplier,
  Variant: prisma.variant,
  Invoice: prisma.invoice,
  StockIn: prisma.stockIn,
  StockAdjustment: prisma.stockAdjustment,
  Expense: prisma.expense,
  Counter: prisma.counter,
  InvoiceItem: prisma.invoiceItem,
  Payment: prisma.payment,
  ReturnRecord: prisma.returnRecord,
  ReturnItem: prisma.returnItem,
  ExchangeItem: prisma.exchangeItem,
};

const dateFields = new Set([
  "createdAt",
  "updatedAt",
  "issuedDate",
  "date",
  "receivedDate",
]);

const booleanFieldsByTable = {
  Product: ["active"],
  Variant: ["active"],
  Supplier: ["active"],
  ReturnItem: ["restock"],
};

function dumpSqlite(path) {
  const python = String.raw`
import json
import sqlite3
import sys

path = sys.argv[1]
tables = sys.argv[2].split(",")
con = sqlite3.connect(path)
con.row_factory = sqlite3.Row
cur = con.cursor()
out = {}
for table in tables:
    existing = cur.execute(
        "select name from sqlite_master where type='table' and name=?",
        (table,),
    ).fetchone()
    if not existing:
        out[table] = []
        continue
    rows = cur.execute(f'select * from "{table}"').fetchall()
    out[table] = [dict(row) for row in rows]
con.close()
print(json.dumps(out))
`;

  const result = spawnSync(
    "python",
    ["-c", python, path, tableOrder.join(",")],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || "Could not read SQLite database.");
  }

  return JSON.parse(result.stdout);
}

function normalizeRecord(table, row) {
  const out = {};
  const booleanFields = new Set(booleanFieldsByTable[table] ?? []);
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue;
    if (value === null) {
      out[key] = null;
    } else if (dateFields.has(key)) {
      out[key] = new Date(value);
    } else if (booleanFields.has(key)) {
      out[key] = Boolean(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function countAll() {
  const counts = {};
  for (const table of tableOrder) {
    counts[table] = await modelByTable[table].count();
  }
  return counts;
}

async function deleteAll() {
  for (const table of [...tableOrder].reverse()) {
    await modelByTable[table].deleteMany();
  }
}

try {
  const currentCounts = await countAll();
  const existingRows = Object.values(currentCounts).reduce((sum, count) => sum + count, 0);
  if (existingRows > 0 && !replace) {
    console.error("Supabase database is not empty. Re-run with --replace to wipe and import.");
    console.error(currentCounts);
    process.exit(1);
  }

  if (replace) {
    console.log("Deleting existing target database rows...");
    await deleteAll();
  }

  const dump = dumpSqlite(sqlitePath);

  for (const table of tableOrder) {
    const rows = dump[table] ?? [];
    if (rows.length === 0) {
      console.log(`${table}: 0`);
      continue;
    }
    const data = rows.map((row) => normalizeRecord(table, row));
    await modelByTable[table].createMany({ data });
    console.log(`${table}: imported ${data.length}`);
  }

  console.log("SQLite import complete.");
} finally {
  await prisma.$disconnect();
}
