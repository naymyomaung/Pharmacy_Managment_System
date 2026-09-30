import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { salesApi } from '../../api/resources';
import type { Sale } from '../../api/types';
import { useDrugs, useSales, useUnits } from '../../hooks/queries';
import { Card, Spinner, Empty } from '../../components/ui';
import { Field } from '../../components/Field';
import { toast } from '../../lib/alert';
import { day, exportToExcel, monthStart, printReport } from '../../lib/report';

export default function SalesReportPage() {
  const { data, isLoading } = useSales();
  const drugs = useDrugs();
  const units = useUnits();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(day(new Date()));
  const [pay, setPay] = useState('All');
  const [q, setQ] = useState('');

  const saleIds = useMemo(() => (data ?? []).map((s) => s.saleId), [data]);
  const details = useQueries({
    queries: saleIds.map((id) => ({
      queryKey: ['sale', id],
      queryFn: () => salesApi.get(id) as Promise<Sale>,
      staleTime: 60_000,
    })),
  });
  const full: Sale[] = useMemo(
    () => saleIds.map((id, i) => (details[i]?.data as Sale | undefined) ?? (data ?? []).find((s) => s.saleId === id)!).filter(Boolean),
    [saleIds, details, data],
  );

  const drugName = (id: number) => drugs.data?.find((d) => d.drugId === id)?.drugName ?? `#${id}`;
  const unitCode = (id: number) => units.data?.find((u) => u.unitId === id)?.unitCode ?? `#${id}`;

  const rows = useMemo(() => {
    const list = full.filter((s) => {
      const d = day(s.saleDate);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (pay !== 'All' && s.paymentMethod !== pay) return false;
      if (q && !(s.customerName ?? '').toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    return list.map((s) => {
      const items = s.items ?? [];
      return {
        sale: s,
        lines: items.length,
        qty: items.reduce((t, it) => t + Number(it.quantity || 0), 0),
        drugs: [...new Set(items.map((it) => drugName(it.drugId)))].join(', ') || '—',
        units: [...new Set(items.map((it) => unitCode(it.unitId)))].join(', ') || '—',
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, from, to, pay, q, drugs.data, units.data]);

  const tot = rows.reduce(
    (a, r) => ({ qty: a.qty + r.qty, total: a.total + Number(r.sale.totalAmount || 0), disc: a.disc + Number(r.sale.discount || 0), net: a.net + Number(r.sale.netAmount || 0) }),
    { qty: 0, total: 0, disc: 0, net: 0 },
  );

  const excelRows = (): (string | number)[][] => [
    ['Date', 'Receipt #', 'Customer', 'Drugs', 'Lines', 'Qty', 'Units', 'Total (MMK)', 'Discount (MMK)', 'Net (MMK)', 'Payment'],
    ...rows.map((r) => [
      new Date(r.sale.saleDate).toLocaleString(), r.sale.saleId, r.sale.customerName, r.drugs,
      r.lines, r.qty, r.units, Number(r.sale.totalAmount || 0), Number(r.sale.discount || 0), Number(r.sale.netAmount || 0), r.sale.paymentMethod,
    ] as (string | number)[]),
    ['TOTAL', '', '', '', '', tot.qty, '', tot.total, tot.disc, tot.net, ''],
  ];

  const doExcel = () => {
    if (!rows.length) return toast('No data to export', 'error');
    exportToExcel(`sales-report-${from}-to-${to}`, 'Sales', excelRows(), [19, 10, 18, 30, 7, 7, 12, 13, 14, 13, 10]);
    toast('Excel downloaded');
  };
  const doPrint = () => {
    if (!rows.length) return toast('No data to print', 'error');
    const ok = printReport(
      'Sale Report', `${from} → ${to} • Payment: ${pay} • ${rows.length} receipts`,
      ['Date', 'Receipt #', 'Customer', 'Drugs', 'Lines', 'Qty', 'Units', 'Total', 'Disc.', 'Net', 'Pay'],
      rows.map((r) => [
        new Date(r.sale.saleDate).toLocaleString(), r.sale.saleId, r.sale.customerName, r.drugs,
        r.lines, r.qty, r.units, Number(r.sale.totalAmount || 0), Number(r.sale.discount || 0), Number(r.sale.netAmount || 0), r.sale.paymentMethod,
      ]),
      ['TOTAL', '', '', '', '', tot.qty, '', tot.total, tot.disc, tot.net, ''],
    );
    if (!ok) toast('Popup blocked — allow popups to print', 'error');
  };

  return (
    <Card
      title="Sale Report"
      action={<div className="flex gap-2"><button className="btn-ghost" type="button" onClick={doPrint}>🖨 Print</button><button className="btn-primary" type="button" onClick={doExcel}>⬇ Excel</button></div>}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="From"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Payment"><select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>
          {['All', 'Cash', 'Card', 'Mobile'].map((p) => <option key={p}>{p}</option>)}
        </select></Field>
        <Field label="Customer search"><input className="input" placeholder="name…" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
      </div>
      {isLoading ? <Spinner /> : !rows.length ? <Empty /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="table min-w-[900px]">
            <thead><tr><th>Date</th><th>#</th><th>Customer</th><th>Drugs</th><th>Lines</th><th>Qty</th><th>Units</th><th>Total</th><th>Disc.</th><th>Net</th><th>Pay</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sale.saleId}>
                  <td className="text-xs">{new Date(r.sale.saleDate).toLocaleString()}</td>
                  <td>{r.sale.saleId}</td>
                  <td>{r.sale.customerName}</td>
                  <td className="max-w-[220px] truncate text-xs" title={r.drugs}>{r.drugs}</td>
                  <td>{r.lines || '—'}</td>
                  <td>{r.qty || '—'}</td>
                  <td className="text-xs">{r.units}</td>
                  <td>{Number(r.sale.totalAmount || 0).toFixed(0)}</td>
                  <td>{Number(r.sale.discount || 0).toFixed(0)}</td>
                  <td className="font-bold">{Number(r.sale.netAmount || 0).toFixed(0)}</td>
                  <td>{r.sale.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-slate-50 font-bold">
              <td colSpan={4}>TOTAL ({rows.length} receipts)</td><td></td><td>{tot.qty}</td><td></td>
              <td>{tot.total.toFixed(0)}</td><td>{tot.disc.toFixed(0)}</td><td>{tot.net.toFixed(0)}</td><td></td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
