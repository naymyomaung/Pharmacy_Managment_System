import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../api/resources';
import type { Supplier } from '../api/types';
import { useSuppliers } from '../hooks/queries';
import { Card, Spinner, Empty } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field } from '../components/Field';
import { toast, confirmDelete, apiError } from '../lib/alert';

const empty = { supplierName: '', contactPerson: '', phone: '', address: '' };

export default function SuppliersPage() {
  const { data, isLoading } = useSuppliers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ['suppliers'] });

  const openAdd = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditId(s.supplierId);
    setForm({ supplierName: s.supplierName, contactPerson: s.contactPerson ?? '', phone: s.phone ?? '', address: s.address ?? '' });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => editId ? suppliersApi.update(editId, { ...form, supplierId: editId }) : suppliersApi.create(form),
    onSuccess: () => { toast('Saved'); setOpen(false); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });
  const del = useMutation({
    mutationFn: (id: number) => suppliersApi.remove(id),
    onSuccess: () => { toast('Deleted'); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });

  const cols: ColumnDef<Supplier>[] = [
    { header: 'Supplier name', accessorKey: 'supplierName' },
    { header: 'Contact person', accessorKey: 'contactPerson' },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Address', accessorKey: 'address' },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(row.original)}>Edit</button>
        <button className="btn-danger px-2 py-1 text-xs" onClick={async () => { if (await confirmDelete(row.original.supplierName)) del.mutate(row.original.supplierId); }}>Del</button>
      </div>) },
  ];

  return (
    <>
      <Card title="Suppliers" action={<button className="btn-primary" onClick={openAdd}>+ Add Supplier</button>}>
        {isLoading ? <Spinner /> : !data?.length ? <Empty /> : <DataTable columns={cols} data={data} />}
      </Card>
      {open && (
        <Modal title={editId ? 'Edit supplier' : 'Add supplier'} onClose={() => setOpen(false)}>
          <div className="grid gap-3">
            <Field label="Supplier name *"><input className="input" placeholder="e.g. ABC Pharma Ltd" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></Field>
            <Field label="Contact person"><input className="input" placeholder="e.g. Mr. Smith" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Phone"><input className="input" placeholder="e.g. 09-123456789" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Address"><input className="input" placeholder="e.g. Yangon" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => save.mutate()}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
