import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { purchasesApi } from '../../api/resources';
import type { Purchase } from '../../api/types';
import { useDrugs, usePurchases, useSuppliers, useUnits } from '../../hooks/queries';
import { Card, Spinner, Empty } from '../../components/ui';
import { Field } from '../../components/Field';
import { toast } from '../../lib/alert';
import { day, exportToExcel, monthStart, printReport } from '../../lib/report';

export default function PurchasesReportPage() {
  const { data, isLoading } = usePurchases();
  const drugs = useDrugs();
  const units = useUnits();
  const suppliers = useSuppliers();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(day(new Date()));
  const [sup, setSup] = useState('All');
  const [q, setQ] = useState('');

  const ids = useMemo(() => (data ?? []).map((p) => p.purchaseId), [data]);
  const details = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['purchase', id],
      queryFn: () => purchasesApi.get(id) as Promise<Purchase>,
      staleTime: 60_000,
    })),
  });
  const full: Purchase[] = useMemo(
    () => ids.map((id, i) => (details[i]?.data as Purchase | undefined) ?? (data ?? []).find((p) => p.purchaseId === id)!).filter(Boolean),
    [ids, details, data],
  );

  const supName = (id?: number | null) => id == null ? '—' : (suppliers.data?.find((s) => s.supplierId === id)?.supplierName ?? `#${id}`);
  const drugName = (id: number) => drugs.data?.find((d) => d.drugId === id)?.drugName ?? `#${id}`;
  const unitCode = (id: number) => units.data?.find((u) => u.unitId === id)?.unitCode ?? `#${id}`;

  const rows = useMemo(() => {
    const list = full.filter((p) => {
      const d = day(p.purchaseDate);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (sup !== 'All' && String(p.supplierId ?? '') !== sup) return false;
      if (q && !(p.invoiceNumber ?? '').toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    return list.map((p) => {
      const items = p.items ?? [];
      return {
        p,
        lines: items.length,
        qty: items.reduce((t, it) => t + Number(it.quantity || 0), 0),
        drugs: [...new Set(items.map((it) => drugName(it.drugId)))].join(', ') || '—',
        units: [...new Set(items.map((it) => unitCode(it.unitId)))].join(', ') || '—',
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, from, to, sup, q, drugs.data, units.data, suppliers.data]);

  const totQty = rows.reduce((s, r) => s + r.qty, 0);
  const totAmt = rows.reduce((s, r) => s + Number(r.p.totalAmount || 0), 0);

  const excelRows = (): (string | number)[][] => [
    ['Date', 'Purchase #', 'Invoice', 'Supplier', 'Drugs', 'Lines', 'Qty', 'Units', 'Total (MMK)'],
    ...rows.map((r) => [
      new Date(r.p.purchaseDate).toLocaleString(), r.p.purchaseId, r.p.invoiceNumber ?? '', supName(r.p.supplierId),
      r.drugs, r.lines, r.qty, r.units, Number(r.p.totalAmount || 0),
    ] as (string | number)[]),
    ['TOTAL', '', '', '', '', '', totQty, '', totAmt],
  ];

  const doExcel = () => {
    if (!rows.length) return toast('No data to export', 'error');
    exportToExcel(`purchase-report-${from}-to-${to}`, 'Purchases', excelRows(), [19, 11, 18, 18, 30, 7, 7, 12, 13]);
    toast('Excel downloaded');
  };
  const doPrint = () => {
    if (!rows.length) return toast('No data to print', 'error');
    const ok = printReport(
      'Purchase Report', `${from} → ${to} • Supplier: ${sup === 'All' ? 'All' : supName(Number(sup))} • ${rows.length} purchases`,
      ['Date', 'Purchase #', 'Invoice', 'Supplier', 'Drugs', 'Lines', 'Qty', 'Units', 'Total (MMK)'],
      rows.map((r) => [
        new Date(r.p.purchaseDate).toLocaleString(), r.p.purchaseId, r.p.invoiceNumber ?? '', supName(r.p.supplierId),
        r.drugs, r.lines, r.qty, r.units, Number(r.p.totalAmount || 0),
      ]),
      ['TOTAL', '', '', '', '', '', totQty, '', totAmt],
    );
    if (!ok) toast('Popup blocked — allow popups to print', 'error');
  };

  return (
    <Card
      title="Purchase Report"
      action={<div className="flex gap-2"><button className="btn-ghost" type="button" onClick={doPrint}>🖨 Print</button><button className="btn-primary" type="button" onClick={doExcel}>⬇ Excel</button></div>}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="From"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Supplier"><select className="input" value={sup} onChange={(e) => setSup(e.target.value)}>
          <option value="All">All</option>
          {(suppliers.data ?? []).map((s) => <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>)}
        </select></Field>
        <Field label="Invoice search"><input className="input" placeholder="INV-…" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
      </div>
      {isLoading ? <Spinner /> : !rows.length ? <Empty /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="table min-w-[900px]">
            <thead><tr><th>Date</th><th>#</th><th>Invoice</th><th>Supplier</th><th>Drugs</th><th>Lines</th><th>Qty</th><th>Units</th><th>Total</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.purchaseId}>
                  <td className="text-xs">{new Date(r.p.purchaseDate).toLocaleString()}</td>
                  <td>{r.p.purchaseId}</td>
                  <td>{r.p.invoiceNumber}</td>
                  <td>{supName(r.p.supplierId)}</td>
                  <td className="max-w-[220px] truncate text-xs" title={r.drugs}>{r.drugs}</td>
                  <td>{r.lines || '—'}</td>
                  <td>{r.qty || '—'}</td>
                  <td className="text-xs">{r.units}</td>
                  <td className="font-bold">{Number(r.p.totalAmount || 0).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-slate-50 font-bold">
              <td colSpan={5}>TOTAL ({rows.length} purchases)</td><td></td><td>{totQty}</td><td></td><td>{totAmt.toFixed(0)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
