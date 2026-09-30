import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { purchasesApi, salesApi } from '../../api/resources';
import type { Purchase, Sale } from '../../api/types';
import { useConversions, useDrugs, usePurchases, useSales, useUnits } from '../../hooks/queries';
import { Card, Spinner, Empty } from '../../components/ui';
import { Field } from '../../components/Field';
import { toast } from '../../lib/alert';
import { day, exportToExcel, monthStart, printReport } from '../../lib/report';

export default function ClosingReportPage() {
  const drugsQ = useDrugs();
  const units = useUnits();
  const conversions = useConversions();
  const purchasesQ = usePurchases();
  const salesQ = useSales();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(day(new Date()));
  const [q, setQ] = useState('');

  const pIds = useMemo(() => (purchasesQ.data ?? []).map((p) => p.purchaseId), [purchasesQ.data]);
  const sIds = useMemo(() => (salesQ.data ?? []).map((s) => s.saleId), [salesQ.data]);
  const pDetails = useQueries({
    queries: pIds.map((id) => ({ queryKey: ['purchase', id], queryFn: () => purchasesApi.get(id) as Promise<Purchase>, staleTime: 60_000 })),
  });
  const sDetails = useQueries({
    queries: sIds.map((id) => ({ queryKey: ['sale', id], queryFn: () => salesApi.get(id) as Promise<Sale>, staleTime: 60_000 })),
  });
  const purchases: Purchase[] = useMemo(
    () => pIds.map((id, i) => (pDetails[i]?.data as Purchase | undefined) ?? purchasesQ.data?.find((p) => p.purchaseId === id)!).filter(Boolean),
    [pIds, pDetails, purchasesQ.data],
  );
  const sales: Sale[] = useMemo(
    () => sIds.map((id, i) => (sDetails[i]?.data as Sale | undefined) ?? salesQ.data?.find((s) => s.saleId === id)!).filter(Boolean),
    [sIds, sDetails, salesQ.data],
  );

  const loading = drugsQ.isLoading || purchasesQ.isLoading || salesQ.isLoading;

  const factor = (drugId: number, fromUnit: number, baseUnit: number): number => {
    if (!fromUnit || fromUnit === baseUnit) return 1;
    const exact = conversions.data?.find((x) => x.drugId === drugId && x.fromUnitId === fromUnit && x.toUnitId === baseUnit);
    if (exact) return Number(exact.conversionFactor);
    const rev = conversions.data?.find((x) => x.drugId === drugId && x.fromUnitId === baseUnit && x.toUnitId === fromUnit);
    if (rev && Number(rev.conversionFactor) !== 0) return 1 / Number(rev.conversionFactor);
    return 1;
  };
  const unitCode = (id: number) => units.data?.find((u) => u.unitId === id)?.unitCode ?? `#${id}`;

  const rows = useMemo(() => {
    const inRange = (d: string) => (!from || day(d) >= from) && (!to || day(d) <= to);
    const bought = new Map<number, number>();
    const sold = new Map<number, number>();
    for (const p of purchases) {
      if (!inRange(p.purchaseDate)) continue;
      for (const it of p.items ?? []) {
        const d = drugsQ.data?.find((x) => x.drugId === it.drugId);
        const f = factor(it.drugId, it.unitId, d?.baseUnitId ?? it.unitId);
        bought.set(it.drugId, (bought.get(it.drugId) ?? 0) + Math.floor(Number(it.quantity || 0) * f));
      }
    }
    for (const s of sales) {
      if (!inRange(s.saleDate)) continue;
      for (const it of s.items ?? []) {
        const d = drugsQ.data?.find((x) => x.drugId === it.drugId);
        const f = factor(it.drugId, it.unitId, d?.baseUnitId ?? it.unitId);
        sold.set(it.drugId, (sold.get(it.drugId) ?? 0) + Math.floor(Number(it.quantity || 0) * f));
      }
    }
    return (drugsQ.data ?? [])
      .filter((d) => !q || d.drugName.toLowerCase().includes(q.toLowerCase()) || (d.genericName ?? '').toLowerCase().includes(q.toLowerCase()))
      .map((d) => {
        const purchased = bought.get(d.drugId) ?? 0;
        const soldQty = sold.get(d.drugId) ?? 0;
        const closing = Number(d.stockQuantity || 0);
        const opening = closing - purchased + soldQty;
        return { d, purchased, soldQty, closing, opening, value: closing * Number(d.sellingPrice || 0) };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases, sales, drugsQ.data, conversions.data, units.data, from, to, q]);

  const tot = rows.reduce((a, r) => ({ p: a.p + r.purchased, s: a.s + r.soldQty, c: a.c + r.closing, v: a.v + r.value }), { p: 0, s: 0, c: 0, v: 0 });

  const excelRows = (): (string | number)[][] => [
    ['Drug', 'Generic', 'Category', 'Base Unit', `Opening (${from})`, `Purchased (${from}→${to})`, `Sold (${from}→${to})`, 'Closing (now)', 'Unit Price (MMK)', 'Stock Value (MMK)'],
    ...rows.map((r) => [r.d.drugName, r.d.genericName ?? '', r.d.category ?? '', unitCode(r.d.baseUnitId), r.opening, r.purchased, r.soldQty, r.closing, Number(r.d.sellingPrice || 0), Math.round(r.value)] as (string | number)[]),
    ['TOTAL', '', '', '', '', tot.p, tot.s, tot.c, '', Math.round(tot.v)],
  ];

  const doExcel = () => {
    if (!rows.length) return toast('No data to export', 'error');
    exportToExcel(`drug-closing-${from}-to-${to}`, 'Closing', excelRows(), [24, 18, 14, 10, 12, 12, 12, 12, 15, 16]);
    toast('Excel downloaded');
  };
  const doPrint = () => {
    if (!rows.length) return toast('No data to print', 'error');
    const ok = printReport(
      'Drug Closing Report', `${from} → ${to} • Closing = current stock • Opening = Closing − Purchased + Sold (base units)`,
      ['Drug', 'Generic', 'Category', 'Unit', 'Opening', 'Purchased', 'Sold', 'Closing', 'Price', 'Value (MMK)'],
      rows.map((r) => [r.d.drugName, r.d.genericName ?? '', r.d.category ?? '', unitCode(r.d.baseUnitId), r.opening, r.purchased, r.soldQty, r.closing, Number(r.d.sellingPrice || 0), Math.round(r.value)]),
      ['TOTAL', '', '', '', '', tot.p, tot.s, tot.c, '', Math.round(tot.v)],
    );
    if (!ok) toast('Popup blocked — allow popups to print', 'error');
  };

  return (
    <Card
      title="Drug Closing Report"
      action={<div className="flex gap-2"><button className="btn-ghost" type="button" onClick={doPrint}>🖨 Print</button><button className="btn-primary" type="button" onClick={doExcel}>⬇ Excel</button></div>}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="From"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Drug search"><input className="input" placeholder="name…" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
      </div>
      <p className="-mt-1 mb-3 text-xs text-slate-500">All quantities in base units (converted). Opening = Closing − Purchased + Sold for the period.</p>
      {loading ? <Spinner /> : !rows.length ? <Empty /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="table min-w-[900px]">
            <thead><tr><th>Drug</th><th>Generic</th><th>Category</th><th>Unit</th><th>Opening</th><th>Purchased</th><th>Sold</th><th>Closing</th><th>Price</th><th>Value</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.d.drugId}>
                  <td className="font-medium">{r.d.drugName}</td>
                  <td className="text-xs">{r.d.genericName || '—'}</td>
                  <td className="text-xs">{r.d.category || '—'}</td>
                  <td className="text-xs">{unitCode(r.d.baseUnitId)}</td>
                  <td>{r.opening}</td>
                  <td className="text-green-700">+{r.purchased}</td>
                  <td className="text-red-600">−{r.soldQty}</td>
                  <td className="font-bold">{r.closing}</td>
                  <td>{Number(r.d.sellingPrice || 0).toFixed(0)}</td>
                  <td className="font-bold">{Math.round(r.value).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-slate-50 font-bold">
              <td colSpan={5}>TOTAL</td><td>{tot.p}</td><td>{tot.s}</td><td>{tot.c}</td><td></td><td>{Math.round(tot.v).toFixed(0)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
