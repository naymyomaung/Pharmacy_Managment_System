import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Drug } from '../../api/types';
import { useDrugs, useUnits } from '../../hooks/queries';
import { Card, Spinner, Empty, Badge } from '../../components/ui';
import { DataTable } from '../../components/DataTable';
import { Field } from '../../components/Field';
import { toast } from '../../lib/alert';
import { exportToExcel, printReport } from '../../lib/report';

const WINDOW_DAYS = 7;

export default function NearExpiryReportPage() {
  const drugs = useDrugs();
  const units = useUnits();
  const [q, setQ] = useState('');

  const unitCode = (id: number) => units.data?.find((u) => u.unitId === id)?.unitCode ?? `#${id}`;
  const daysLeft = (exp: string) => Math.ceil((new Date(exp).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);

  const rows = useMemo(() => {
    const list = (drugs.data ?? []).filter((d) => {
      if (!d.expiryDate) return false;
      if (daysLeft(d.expiryDate) > WINDOW_DAYS) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!((d.drugName ?? '').toLowerCase().includes(s) || (d.genericName ?? '').toLowerCase().includes(s) || (d.category ?? '').toLowerCase().includes(s))) return false;
      }
      return true;
    });
    return list.sort((a, b) => +new Date(a.expiryDate!) - +new Date(b.expiryDate!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drugs.data, q]);

  const cols: ColumnDef<Drug>[] = [
    { header: 'Drug', accessorKey: 'drugName' },
    { header: 'Generic', cell: ({ row }) => row.original.genericName || '—' },
    { header: 'Category', cell: ({ row }) => row.original.category || '—' },
    { id: 'stock', header: 'Stock', cell: ({ row }) => `${row.original.stockQuantity} ${unitCode(row.original.baseUnitId)}` },
    { id: 'expiry', header: 'Expiry', cell: ({ row }) => row.original.expiryDate ? new Date(row.original.expiryDate).toLocaleDateString() : '—' },
    {
      id: 'left', header: 'Days left',
      cell: ({ row }) => {
        const n = daysLeft(row.original.expiryDate!);
        if (n < 0) return <Badge tone="red">Expired {Math.abs(n)}d ago</Badge>;
        if (n === 0) return <Badge tone="red">Expires today</Badge>;
        return <Badge tone={n <= 3 ? 'amber' : 'blue'}>{n} day(s)</Badge>;
      },
    },
    { id: 'price', header: 'Price', cell: ({ row }) => `${Number(row.original.sellingPrice).toFixed(0)} MMK` },
    { id: 'value', header: 'Stock value', cell: ({ row }) => `${(Number(row.original.stockQuantity) * Number(row.original.sellingPrice)).toFixed(0)} MMK` },
  ];

  const excelRows = (): (string | number)[][] => [
    ['Drug', 'Generic', 'Category', 'Stock', 'Unit', 'Expiry', 'Days left', 'Price (MMK)', 'Stock value (MMK)'],
    ...rows.map((d) => [
      d.drugName, d.genericName || '', d.category || '', d.stockQuantity, unitCode(d.baseUnitId),
      d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '', daysLeft(d.expiryDate!),
      Number(d.sellingPrice), Number(d.stockQuantity) * Number(d.sellingPrice),
    ] as (string | number)[]),
  ];

  const doExcel = () => {
    if (!rows.length) return toast('No data to export', 'error');
    exportToExcel('near-expiry-report', 'NearExpiry', excelRows(), [22, 20, 16, 8, 8, 12, 10, 13, 16]);
    toast('Excel downloaded');
  };
  const doPrint = () => {
    if (!rows.length) return toast('No data to print', 'error');
    const ok = printReport(
      'Near Expiry Report', `Expiring within ${WINDOW_DAYS} days • ${rows.length} drug(s)`,
      ['Drug', 'Generic', 'Category', 'Stock', 'Unit', 'Expiry', 'Days left', 'Price (MMK)', 'Stock value (MMK)'],
      excelRows().slice(1),
    );
    if (!ok) toast('Popup blocked — allow popups to print', 'error');
  };

  return (
    <div className="grid gap-4">
      <Card
        title={`Near Expiry — within ${WINDOW_DAYS} days`}
        action={<div className="flex gap-2">
          <button className="btn-ghost" type="button" onClick={doPrint}>🖨 Print</button>
          <button className="btn-ghost" type="button" onClick={doExcel}>📥 Excel</button>
        </div>}
      >
        <div className="mb-3 grid max-w-md gap-2">
          <Field label="Search drug"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Drug / generic / category…" /></Field>
        </div>
        {drugs.isLoading ? <Spinner /> : !rows.length ? <Empty text="No drugs expiring within 7 days." /> : <DataTable columns={cols} data={rows} />}
      </Card>
    </div>
  );
}
