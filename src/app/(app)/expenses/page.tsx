import { prisma } from "@/lib/prisma";
import { formatLkr } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, THead, TD, TH } from "@/components/ui/table";
import { ExpenseForm } from "./ExpenseForm";

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    take: 200,
  });

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Expenses</PageTitle>
          <PageDescription>
            Quick log for ads, shipping, supplies, and misc costs
          </PageDescription>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Add expense</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Category</TH>
                <TH>Description</TH>
                <TH>Payment</TH>
                <TH align="right">Amount</TH>
                <TH>Notes</TH>
              </tr>
            </THead>
            <TBody>
              {expenses.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={6}>
                    No expenses yet. Add your first expense above.
                  </TD>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50">
                    <TD>{e.date.toISOString().slice(0, 10)}</TD>
                    <TD>{e.category}</TD>
                    <TD>{e.description}</TD>
                    <TD>{e.paymentMethod}</TD>
                    <TD align="right">{formatLkr(e.amount)}</TD>
                    <TD className="text-zinc-600">{e.notes}</TD>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>
    </Page>
  );
}
