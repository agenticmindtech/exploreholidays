"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { salesApi } from "@/lib/api/salesApi";
import { usersApi } from "@/lib/api/usersApi";
import { receivablesApi } from "@/lib/api/receivablesApi";
import { refundsApi } from "@/lib/api/refundsApi";
import { resetDemoData } from "@/lib/api/client";
import type { Filters } from "@/lib/types";

interface Section {
  key: string;
  title: string;
  description: string;
  run: () => Promise<unknown>;
}

async function getRoleIds() {
  const { rows: users } = await usersApi.list({ page: 1, pageSize: 100 });
  const staff = users.find((u) => u.role === "staff");
  const accounts = users.find((u) => u.role === "accounts");
  if (!staff || !accounts) throw new Error("Seed data is missing a staff or accounts user.");
  return { staffId: staff.id, accountsId: accounts.id };
}

export default function ApiTestPage() {
  const toast = useToast();
  const [output, setOutput] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function run(key: string, fn: () => Promise<unknown>) {
    setLoading((l) => ({ ...l, [key]: true }));
    try {
      const result = await fn();
      setOutput((o) => ({ ...o, [key]: result }));
      toast.success(`${key} succeeded`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setOutput((o) => ({ ...o, [key]: { error: message } }));
      toast.error(`${key} failed`, message);
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }

  const filterSections: Section[] = [
    {
      key: "filter-month",
      title: "List — This Month",
      description: "applyFilters with preset=month",
      run: () => salesApi.list({ preset: "month", page: 1, pageSize: 5 } satisfies Filters),
    },
    {
      key: "filter-posted",
      title: "List — Posted Only",
      description: "applyFilters with status=posted",
      run: () => salesApi.list({ status: "posted", page: 1, pageSize: 5, sortBy: "sellingPrice", sortDir: "desc" } satisfies Filters),
    },
    {
      key: "filter-search",
      title: 'List — Search "Istanbul"',
      description: "applyFilters with a text search across bookingNo/destination/description/customer",
      run: () => salesApi.list({ search: "Istanbul", page: 1, pageSize: 5 } satisfies Filters),
    },
  ];

  async function runLifecycle() {
    const { staffId, accountsId } = await getRoleIds();
    const chain: Record<string, unknown> = {};

    const created = await salesApi.create({
      bookingNo: `BK-TEST-${Date.now()}`,
      transactionDate: new Date().toISOString().slice(0, 10),
      branchId: (await usersApi.get(staffId)).branchId,
      staffId,
      serviceTypeId: "SRV-001",
      destination: "Istanbul, Turkey",
      description: "API test lifecycle sale — created by dev/api-test.",
      supplierId: "SUP-001",
      netCost: 200,
      sellingPrice: 260,
      paymentMethod: "cash",
      paymentStatus: "paid",
      amountReceived: 260,
    });
    chain.create = created;

    const submitted = await salesApi.submit(created.id, staffId, { force: true });
    chain.submit = submitted;

    const returned = await salesApi.returnSale(created.id, accountsId, "Testing the return step of the lifecycle.");
    chain.return = returned;

    const updated = await salesApi.update(created.id, {
      sellingPrice: 275,
      remarks: "Corrected selling price after return, per accounts feedback.",
    });
    chain.update = updated;

    const resubmitted = await salesApi.submit(created.id, staffId, { force: true });
    chain.resubmit = resubmitted;

    const verified = await salesApi.verify(created.id, accountsId);
    chain.verify = verified;

    const posted = await salesApi.post(created.id, accountsId);
    chain.post = posted;

    return chain;
  }

  async function runIllegalTransition() {
    const { accountsId } = await getRoleIds();
    const draft = (await salesApi.list({ status: "draft", page: 1, pageSize: 1 })).rows[0];
    if (!draft) throw new Error("No draft sale available to test an illegal transition against.");
    // A draft sale can never be verified directly — this must throw.
    return salesApi.verify(draft.id, accountsId);
  }

  async function runRecordPayment() {
    const { accountsId } = await getRoleIds();
    const receivable = (await receivablesApi.list({ page: 1, pageSize: 1 })).rows.find((r) => r.balance > 0);
    if (!receivable) throw new Error("No open receivable available to record a payment against.");
    const amount = Math.min(receivable.balance, 25);
    return receivablesApi.recordPayment(receivable.id, amount, "cash", new Date().toISOString().slice(0, 10), accountsId);
  }

  async function runRefundAdvance() {
    const { accountsId } = await getRoleIds();
    const refund = (await refundsApi.list({ page: 1, pageSize: 20 })).rows.find(
      (r) => r.status !== "paid_to_customer" && r.status !== "rejected"
    );
    if (!refund) throw new Error("No refund in an advanceable stage was found.");
    return refundsApi.advance(refund.id, accountsId);
  }

  async function runReset() {
    resetDemoData();
    return { message: "Demo data has been reset to the original seed." };
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="API Test Harness"
        subtitle="Hidden dev page proving every mock service and the universal filter contract work end to end."
        breadcrumb="Dev / API Test"
      />

      <div className="stagger flex flex-col gap-6">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Universal Filters</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {filterSections.map((section) => (
              <Card key={section.key} className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{section.title}</p>
                  <p className="text-xs text-inkMuted">{section.description}</p>
                </div>
                <Button size="sm" loading={loading[section.key]} onClick={() => run(section.key, section.run)}>
                  Run
                </Button>
                {output[section.key] !== undefined && (
                  <pre className="max-h-64 overflow-auto rounded-xl bg-subtle p-3 font-money text-xs text-ink">
                    {JSON.stringify(output[section.key], null, 2)}
                  </pre>
                )}
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Full Lifecycle Chain</h2>
          <Card className="flex flex-col gap-3">
            <p className="text-xs text-inkMuted">
              create → submit → return → update → submit → verify → post, using real staff/accounts users from the seed.
            </p>
            <Button size="sm" loading={loading.lifecycle} onClick={() => run("lifecycle", runLifecycle)}>
              Run lifecycle test
            </Button>
            {output.lifecycle !== undefined && (
              <pre className="max-h-96 overflow-auto rounded-xl bg-subtle p-3 font-money text-xs text-ink">
                {JSON.stringify(output.lifecycle, null, 2)}
              </pre>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Illegal Transition</h2>
          <Card className="flex flex-col gap-3">
            <p className="text-xs text-inkMuted">Verifying a draft sale directly must throw a clear, human error.</p>
            <Button size="sm" variant="danger" loading={loading.illegal} onClick={() => run("illegal", runIllegalTransition)}>
              Attempt illegal verify
            </Button>
            {output.illegal !== undefined && (
              <pre className="max-h-64 overflow-auto rounded-xl bg-subtle p-3 font-money text-xs text-ink">
                {JSON.stringify(output.illegal, null, 2)}
              </pre>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Receivables &amp; Refunds</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-ink">recordPayment</p>
              <Button size="sm" loading={loading.payment} onClick={() => run("payment", runRecordPayment)}>
                Record payment on a receivable
              </Button>
              {output.payment !== undefined && (
                <pre className="max-h-64 overflow-auto rounded-xl bg-subtle p-3 font-money text-xs text-ink">
                  {JSON.stringify(output.payment, null, 2)}
                </pre>
              )}
            </Card>
            <Card className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-ink">refund.advance</p>
              <Button size="sm" loading={loading.refund} onClick={() => run("refund", runRefundAdvance)}>
                Advance a refund
              </Button>
              {output.refund !== undefined && (
                <pre className="max-h-64 overflow-auto rounded-xl bg-subtle p-3 font-money text-xs text-ink">
                  {JSON.stringify(output.refund, null, 2)}
                </pre>
              )}
            </Card>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Reset Demo Data</h2>
          <Card className="flex flex-col gap-3">
            <p className="text-xs text-inkMuted">Discards every mutation made above and restores the original seed.</p>
            <Button size="sm" variant="secondary" loading={loading.reset} onClick={() => run("reset", runReset)}>
              Reset demo data
            </Button>
            {output.reset !== undefined && (
              <pre className="max-h-64 overflow-auto rounded-xl bg-subtle p-3 font-money text-xs text-ink">
                {JSON.stringify(output.reset, null, 2)}
              </pre>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
