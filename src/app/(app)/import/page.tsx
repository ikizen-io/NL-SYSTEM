import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { getDatabaseMode } from "@/lib/runtime";
import { ImportInventoryForm, ImportExpensesForm } from "./ImportForms";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const databaseMode = getDatabaseMode();
  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Import</PageTitle>
          <PageDescription>
            CSV import from your Sheets for inventory and expenses.
          </PageDescription>
        </div>
      </PageHeader>

      {databaseMode.kind === "postgres" ? (
        <Alert tone="warning">
          You are importing into <strong>production data</strong> (Supabase). Double-check
          CSV files before uploading — imports cannot be undone from this screen.
        </Alert>
      ) : (
        <Alert tone="info">
          Local SQLite workspace. Imports update your dev database only.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inventory CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-600">
              Expected headers (recommended):
              <span className="mt-1 block rounded-xl bg-zinc-50 p-2 font-mono text-xs text-zinc-700">
                sku,brand,category,modelName,sizeLabel,unitCost,targetPrice,openingQty
              </span>
            </p>
            <ImportInventoryForm />
            <p className="text-xs text-zinc-500">
              Note: `openingQty` becomes a StockIn entry ("Opening stock import").
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-600">
              Expected headers:
              <span className="mt-1 block rounded-xl bg-zinc-50 p-2 font-mono text-xs text-zinc-700">
                date,category,description,amount,paymentMethod,notes
              </span>
            </p>
            <ImportExpensesForm />
            <p className="text-xs text-zinc-500">
              `paymentMethod` must be one of: BANK, CASH, TRANSFER, COD, KOKO, OTHER.
            </p>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
