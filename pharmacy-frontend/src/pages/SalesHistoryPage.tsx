import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQueries } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { salesApi } from '../api/resources';
import type { Sale } from '../api/types';
import { useDrugs, useSales, useUnits, useUsers } from '../hooks/queries';
import { Card, Spinner, Empty } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { toast, apiError } from '../lib/alert';
import { SlipPrint } from '../components/SlipPrint';
import type { Receipt } from '../components/SlipPrint';

export default function SalesHistoryPage() {
  const { data, isLoading } = useSales();
  const drugs = useDrugs();
  const units = useUnits();
  const users = useUsers();
  const [slip, setSlip] = useState<Receipt | null>(null);

  // Bulk-fetch sale line details so history can show drugs / qty / units
  const saleIds = useMemo(() => (data ?? []).map((s) => s.saleId), [data]);
  const detailQueries = useQueries({
    queries: saleIds.map((id) => ({
      queryKey: ['sale', id],
      queryFn: () => salesApi.get(id) as Promise<Sale>,
      staleTime: 30_000,
    })),
  });
  const detailsMap = useMemo(() => {
    const m = new Map<number, Sale>();
    detailQueries.forEach((q, i) => { if (q.data) m.set(saleIds[i], q.data as Sale); });
    return m;
  }, [detailQueries, saleIds]);

  const unitCode = (id: number) => units.data?.find((u) => u.unitId === id)?.unitCode ?? `#${id}`;
  const drugNameOf = (drugId: number) => drugs.data?.find((d) => d.drugId === drugId)?.drugName ?? `#${drugId}`;
  const drugsOf = (id: number) => {
    const items = detailsMap.get(id)?.items ?? [];
    if (!items.length) return '—';
    return [...new Set(items.map((it) => drugNameOf(it.drugId)))].join(', ');
  };
  const linesOf = (id: number) => detailsMap.get(id)?.items?.length ?? 0;
  const qtyOf = (id: number) => (detailsMap.get(id)?.items ?? []).reduce((s, it) => s + Number(it.quantity || 0), 0);
  const unitsOf = (id: number) => {
    const items = detailsMap.get(id)?.items ?? [];
    if (!items.length) return '—';
    return [...new Set(items.map((it) => unitCode(it.unitId)))].join(', ');
  };

  const viewDetail = async (id: number) => {
    try {
      const s = (detailsMap.get(id) ?? await salesApi.get(id)) as Sale;
      const esc = (v: unknown) => String(v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const items = s.items ?? [];
      const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
      const rows = items.map((it, idx) => {
        const subtotal = (Number(it.quantity) * Number(it.unitPrice)).toFixed(0);
        return `<tr style="border-bottom:1px solid #eee">
          <td style="padding:6px 4px;color:#94a3b8">${idx + 1}</td>
          <td style="padding:6px 4px;font-weight:600">${esc(drugNameOf(it.drugId))}</td>
          <td style="padding:6px 4px">${esc(unitCode(it.unitId))}</td>
          <td style="padding:6px 4px;text-align:right">${it.quantity}</td>
          <td style="padding:6px 4px;text-align:right">${Number(it.unitPrice).toFixed(0)}</td>
          <td style="padding:6px 4px;text-align:right;font-weight:600">${subtotal}</td></tr>`;
      }).join('') || `<tr><td colspan="6" style="padding:12px;text-align:center;color:#94a3b8">No items</td></tr>`;
      Swal.fire({
        title: `Sale #${id}`,
        html: `<div style="text-align:left;font-size:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px">
            <p><b>Customer:</b> ${esc(s.customerName)}</p>
            <p><b>Date:</b> ${new Date(s.saleDate).toLocaleString()}</p>
            <p><b>Payment:</b> ${esc(s.paymentMethod)}</p>
            <p><b>Lines:</b> ${items.length} &nbsp; <b>Total qty:</b> ${totalQty}</p>
            <p><b>Total:</b> ${s.totalAmount} MMK &nbsp; <b>Discount:</b> ${s.discount} MMK</p>
            <p><b>Net:</b> ${s.netAmount} MMK</p>
          </div>
          <hr style="margin:8px 0"/>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f8fafc;text-align:left">
              <th style="padding:6px 4px">#</th><th style="padding:6px 4px">Drug</th>
              <th style="padding:6px 4px">Unit</th><th style="padding:6px 4px;text-align:right">Qty</th>
              <th style="padding:6px 4px;text-align:right">Price</th><th style="padding:6px 4px;text-align:right">Subtotal (MMK)</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="border-top:2px solid #e2e8f0;font-weight:700">
              <td colspan="3" style="padding:6px 4px">Total (${items.length} lines)</td>
              <td style="padding:6px 4px;text-align:right">${totalQty}</td>
              <td></td><td style="padding:6px 4px;text-align:right">${s.netAmount} MMK</td></tr></tfoot></table></div>`,
        width: 820,
      });
    } catch (e) { toast(String(apiError(e)), 'error'); }
  };

  // Reprint the 80mm slip for a past sale (in-page browser print, no new tab)
  const printSlip = async (id: number) => {
    try {
      const s = (detailsMap.get(id) ?? await salesApi.get(id)) as Sale;
      const cashier = users.data?.find((u) => u.userId === s.userId)?.username ?? 'cashier';
      setSlip({
        saleId: s.saleId,
        customer: s.customerName ?? 'General Customer',
        payment: s.paymentMethod ?? 'Cash',
        date: new Date(s.saleDate).toLocaleString(),
        cashier,
        discount: Number(s.discount || 0),
        items: (s.items ?? []).map((it) => ({
          name: drugNameOf(it.drugId),
          qty: Number(it.quantity),
          unit: unitCode(it.unitId),
          price: Number(it.unitPrice),
        })),
      });
      setTimeout(() => window.print(), 150);
    } catch (e) { toast(String(apiError(e)), 'error'); }
  };

  const cols: ColumnDef<Sale>[] = [
    { header: 'ID', accessorKey: 'saleId' },
    { header: 'Customer', accessorKey: 'customerName' },
    { id: 'drugs', header: 'Drugs', cell: ({ row }) => <span className="text-xs">{drugsOf(row.original.saleId)}</span> },
    { id: 'lines', header: 'Lines', cell: ({ row }) => linesOf(row.original.saleId) || '—' },
    { id: 'qty', header: 'Qty', cell: ({ row }) => qtyOf(row.original.saleId) || '—' },
    { id: 'units', header: 'Units', cell: ({ row }) => <span className="text-xs">{unitsOf(row.original.saleId)}</span> },
    { id: 'net', header: 'Net', cell: ({ row }) => `${row.original.netAmount} MMK` },
    { header: 'Pay', accessorKey: 'paymentMethod' },
    { id: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.saleDate).toLocaleString() },
    { id: 'view', header: 'Details', cell: ({ row }) => (
      <span className="flex gap-1">
        <button className="btn-ghost px-2 py-1 text-xs" type="button" onClick={() => viewDetail(row.original.saleId)}>View</button>
        <button className="btn-ghost px-2 py-1 text-xs" type="button" title="Print 80mm slip" onClick={() => printSlip(row.original.saleId)}>🖨 Slip</button>
      </span>
    ) },
  ];

  return (
    <>
      <Card title="Sales history">
        {isLoading ? <Spinner /> : !data?.length ? <Empty /> : <DataTable columns={cols} data={data} />}
      </Card>
      {/* Hidden 80mm slip — printed in-page via browser print, no new tab */}
      <SlipPrint receipt={slip} />
    </>
  );
}
