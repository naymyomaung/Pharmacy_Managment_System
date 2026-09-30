import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { drugsApi } from '../api/resources';
import type { Drug } from '../api/types';
import { useDrugs } from '../hooks/queries';
import { Card, Spinner, Empty, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field } from '../components/Field';
import { toast, confirmDelete, apiError } from '../lib/alert';

export default function DrugsPage() {
  const { data, isLoading } = useDrugs();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Drug | null>(null);
  const [form, setForm] = useState({ sellingPrice: 0, expiryDate: '' });
  const inv = () => qc.invalidateQueries({ queryKey: ['drugs'] });

  const openEdit = (d: Drug) => {
    setTarget(d);
    setForm({ sellingPrice: d.sellingPrice, expiryDate: d.expiryDate?.slice(0, 10) ?? '' });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => drugsApi.update(target!.drugId, {
      ...target!,
      sellingPrice: Number(form.sellingPrice),
      expiryDate: form.expiryDate || null,
    }),
    onSuccess: () => { toast('Price & expiry updated'); setOpen(false); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });
  const del = useMutation({
    mutationFn: (id: number) => drugsApi.remove(id),
    onSuccess: () => { toast('Deleted'); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });

  const cols: ColumnDef<Drug>[] = [
    { header: 'Drug name', accessorKey: 'drugName' },
    { header: 'Generic name', accessorKey: 'genericName' },
    { header: 'Category', accessorKey: 'category' },
    { id: 'sellPrice', header: 'Sell price', cell: ({ row }) => `${row.original.sellingPrice} MMK` },
    { id: 'expiry', header: 'Expiry', cell: ({ row }) => row.original.expiryDate ? new Date(row.original.expiryDate).toLocaleDateString() : '—' },
    { id: 'stock', header: 'Stock', cell: ({ row }) => <Badge tone={row.original.stockQuantity < 10 ? 'red' : 'green'}>{row.original.stockQuantity}</Badge> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(row.original)}>Price/Expiry</button>
        <button className="btn-danger px-2 py-1 text-xs" onClick={async () => { if (await confirmDelete(row.original.drugName)) del.mutate(row.original.drugId); }}>Del</button>
      </div>) },
  ];

  return (
    <>
      <Card title="Drugs">
        {isLoading ? <Spinner /> : !data?.length ? <Empty /> : <DataTable columns={cols} data={data} />}
      </Card>
      {open && target && (
        <Modal title={`Update ${target.drugName}`} onClose={() => setOpen(false)}>
          <div className="grid gap-3">
            <Field label="Sell price (MMK) *"><input type="number" min={0} className="input" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} /></Field>
            <Field label="Expiry date"><input type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => save.mutate()}>Update</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
