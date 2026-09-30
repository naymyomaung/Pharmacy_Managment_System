import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unitsApi } from '../api/resources';
import type { Unit } from '../api/types';
import { useUnits } from '../hooks/queries';
import { Card, Spinner, Empty } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field } from '../components/Field';
import { toast, confirmDelete, apiError } from '../lib/alert';

export default function UnitsPage() {
  const { data, isLoading } = useUnits();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ unitName: '', unitCode: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ['units'] });

  const openAdd = () => { setEditId(null); setForm({ unitName: '', unitCode: '' }); setOpen(true); };
  const openEdit = (u: Unit) => { setEditId(u.unitId); setForm({ unitName: u.unitName, unitCode: u.unitCode }); setOpen(true); };

  const save = useMutation({
    mutationFn: () => editId ? unitsApi.update(editId, { ...form, unitId: editId }) : unitsApi.create(form),
    onSuccess: () => { toast('Saved'); setOpen(false); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });
  const del = useMutation({
    mutationFn: (id: number) => unitsApi.remove(id),
    onSuccess: () => { toast('Deleted'); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });

  const cols: ColumnDef<Unit>[] = [
    { header: 'ID', accessorKey: 'unitId' },
    { header: 'Unit name', accessorKey: 'unitName' },
    { header: 'Unit code', accessorKey: 'unitCode' },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(row.original)}>Edit</button>
        <button className="btn-danger px-2 py-1 text-xs" onClick={async () => { if (await confirmDelete(row.original.unitName)) del.mutate(row.original.unitId); }}>Del</button>
      </div>) },
  ];

  return (
    <>
      <Card title="Units" action={<button className="btn-primary" onClick={openAdd}>+ Add Unit</button>}>
        {isLoading ? <Spinner /> : !data?.length ? <Empty /> : <DataTable columns={cols} data={data} />}
      </Card>
      {open && (
        <Modal title={editId ? 'Edit unit' : 'Add unit'} onClose={() => setOpen(false)}>
          <div className="grid gap-3">
            <Field label="Unit name *" hint="e.g. Tablet, Strip, Box, Bottle">
              <input className="input" placeholder="e.g. Strip" value={form.unitName} onChange={(e) => setForm({ ...form, unitName: e.target.value })} />
            </Field>
            <Field label="Unit code *" hint="Short unique code, e.g. TBL, STRP, BOX, BTL">
              <input className="input" placeholder="e.g. STRP" value={form.unitCode} onChange={(e) => setForm({ ...form, unitCode: e.target.value })} />
            </Field>
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
