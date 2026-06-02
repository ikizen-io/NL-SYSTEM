import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentStock } from "@/lib/inventory";
import {
  invoiceDetailInclude,
  invoiceStatsFromRecord,
  toReturnRecordInput,
} from "@/lib/invoice-queries";
import { availableReturnQty } from "@/lib/returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { ArrowLeft, Printer } from "lucide-react";
import { AddPaymentForm } from "./AddPaymentForm";
import { InvoiceDetailTabs } from "./InvoiceDetailTabs";
import { InvoiceEditForm } from "./InvoiceEditForm";
import { InvoiceStatusPanel } from "./InvoiceStatusPanel";
import { PaymentManager } from "./PaymentManager";
import { ReturnExchangeForm } from "./ReturnExchangeForm";
import { ReturnsHistory } from "./ReturnsHistory";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoice: string }>;
}) {
  const { invoice } = await params;
  const decodedInvoice = decodeURIComponent(invoice);
  const legacyInvoiceNo = decodedInvoice.startsWith("#")
    ? decodedInvoice
    : `#${decodedInvoice}`;

  const inv = await prisma.invoice.findFirst({
    where: {
      OR: [{ invoiceNo: decodedInvoice }, { invoiceNo: legacyInvoiceNo }],
    },
    include: invoiceDetailInclude,
  });

  if (!inv) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Invoice</h1>
        <p className="text-sm text-zinc-500">Not found.</p>
        <Link prefetch={false} className="text-sm underline" href="/sales">
          Back to Sales
        </Link>
      </div>
    );
  }

  const returnRecords = toReturnRecordInput(inv.returnRecords);
  const stats = invoiceStatsFromRecord(inv);
  const currentVariantIds = inv.items.map((item) => item.variantId);

  const [variants, customerList] = await Promise.all([
    prisma.variant.findMany({
      where: {
        OR: [{ active: true }, { id: { in: currentVariantIds } }],
      },
      include: {
        product: true,
        stockIns: true,
        adjustments: true,
        invoiceItems: { include: { invoice: { select: { status: true } } } },
      },
      orderBy: { sku: "asc" },
    }),
    prisma.customer.findMany({
      select: {
        name: true,
        phone: true,
        instagramHandle: true,
        address: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const currentIssuedQty = new Map<string, number>();
  if (inv.status === "ISSUED") {
    for (const item of inv.items) {
      currentIssuedQty.set(
        item.variant.sku,
        (currentIssuedQty.get(item.variant.sku) ?? 0) + item.qty,
      );
    }
  }

  const saleSkus = variants.map((variant) => ({
    sku: variant.sku,
    label: `${variant.sku} — ${variant.product.brand} / ${
      variant.product.modelName
    } / ${variant.sizeLabel}${variant.color ? ` / ${variant.color}` : ""}`,
    targetPrice: variant.targetPrice,
    stock:
      currentStock(variant) + (currentIssuedQty.get(variant.sku) ?? 0),
  }));

  const lineItems = inv.items.map((item) => {
    const returnedQty =
      returnRecords
        .flatMap((record) => record.items)
        .filter((entry) => entry.invoiceItemId === item.id)
        .reduce((sum, entry) => sum + entry.qty, 0) ?? 0;
    const netQty = Math.max(0, item.qty - returnedQty);
    return {
      id: item.id,
      sku: item.variant.sku,
      label: `${item.variant.product.modelName} / ${item.variant.sizeLabel}${
        item.variant.color ? ` / ${item.variant.color}` : ""
      }`,
      qty: item.qty,
      returnedQty,
      unitPrice: item.unitPrice,
      lineTotal: item.qty * item.unitPrice,
      netLineTotal: netQty * item.unitPrice,
    };
  });

  const returnFormLines = inv.items.map((item) => ({
    invoiceItemId: item.id,
    sku: item.variant.sku,
    label: `${item.variant.product.modelName} / ${item.variant.sizeLabel}${
      item.variant.color ? ` / ${item.variant.color}` : ""
    }`,
    soldQty: item.qty,
    availableQty: availableReturnQty(item.id, item.qty, returnRecords),
    unitPrice: item.unitPrice,
  }));

  const returnHistory = inv.returnRecords.map((record) => ({
    id: record.id,
    date: record.date.toISOString().slice(0, 10),
    notes: record.notes ?? "",
    refundAmount: record.refundAmount,
    refundMethod: record.refundMethod,
    refundReference: record.refundReference,
    items: record.items.map((item) => ({
      sku: item.invoiceItem.variant.sku,
      label: `${item.invoiceItem.variant.product.modelName} / ${item.invoiceItem.variant.sizeLabel}${
        item.invoiceItem.variant.color ? ` / ${item.invoiceItem.variant.color}` : ""
      }`,
      qty: item.qty,
      restock: item.restock,
    })),
    exchanges: record.exchanges.map((exchange) => ({
      sku: exchange.variant.sku,
      label: `${exchange.variant.product.modelName} / ${exchange.variant.sizeLabel}${
        exchange.variant.color ? ` / ${exchange.variant.color}` : ""
      }`,
      qty: exchange.qty,
      unitPrice: exchange.unitPrice,
    })),
  }));

  return (
    <Page className="space-y-5">
      <PageHeader>
        <div>
          <div className="flex items-center gap-2">
            <PageTitle>{inv.invoiceNo}</PageTitle>
            <Badge tone={stats.tone}>{stats.statusLabel}</Badge>
          </div>
          <PageDescription className="mt-1">
            {inv.issuedDate.toISOString().slice(0, 10)} •{" "}
            {inv.customer?.name ?? "—"}
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild size="sm">
            <Link prefetch={false} href={`/invoices/${encodeURIComponent(inv.invoiceNo.replace("#", ""))}/print`}>
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/sales">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </PageActions>
      </PageHeader>

      <InvoiceDetailTabs
        stats={{
          revenue: stats.revenue,
          gp: stats.gp,
          margin: stats.margin,
          balance: stats.balance,
          paid: stats.paid,
          refunded: stats.refunded,
        }}
        lineItems={lineItems}
        edit={
          <Card>
            <CardHeader>
              <CardTitle>Edit invoice</CardTitle>
            </CardHeader>
            <CardContent>
              {inv.returnRecords.length > 0 ? (
                <p className="mb-3 text-sm text-amber-800">
                  This invoice has return history. Use the Returns tab for
                  exchanges; editing lines here is locked.
                </p>
              ) : null}
              <InvoiceEditForm
                invoice={{
                  invoiceNo: inv.invoiceNo,
                  issuedDate: inv.issuedDate.toISOString().slice(0, 10),
                  customerName: inv.customer?.name ?? "",
                  customerPhone: inv.customer?.phone ?? "",
                  customerInstagram: inv.customer?.instagramHandle ?? "",
                  customerAddress: inv.customer?.address ?? "",
                  shippingCharge: inv.shippingCharge,
                  discountAmount: inv.discountAmount,
                  notes: inv.notes ?? "",
                  status: inv.status,
                  items: inv.items.map((item) => ({
                    id: item.id,
                    sku: item.variant.sku,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                  })),
                }}
                skus={saleSkus}
                customers={customerList}
                paid={stats.paid}
                disabled={inv.returnRecords.length > 0 || inv.status !== "ISSUED"}
              />
            </CardContent>
          </Card>
        }
        returns={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Process return / exchange</CardTitle>
              </CardHeader>
              <CardContent>
                <ReturnExchangeForm
                  invoiceNo={inv.invoiceNo}
                  invoiceSlug={invoice}
                  disabled={inv.status !== "ISSUED"}
                  lines={returnFormLines}
                  skus={saleSkus}
                  paid={stats.paid}
                  balance={stats.balance}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Return history</CardTitle>
              </CardHeader>
              <CardContent>
                <ReturnsHistory records={returnHistory} />
              </CardContent>
            </Card>
          </>
        }
        payments={
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Add payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddPaymentForm
                    invoice={invoice}
                    balance={stats.balance}
                    disabled={inv.status !== "ISSUED"}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Payment history</CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentManager
                    invoiceNo={inv.invoiceNo}
                    disabled={inv.status !== "ISSUED"}
                    payments={inv.payments.map((payment) => ({
                      id: payment.id,
                      date: payment.date.toISOString().slice(0, 10),
                      method: payment.method,
                      amount: payment.amount,
                      reference: payment.reference ?? "",
                    }))}
                  />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Invoice status</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceStatusPanel
                  invoiceSlug={invoice}
                  invoiceNo={inv.invoiceNo}
                  status={inv.status}
                />
              </CardContent>
            </Card>
          </>
        }
      />
    </Page>
  );
}
