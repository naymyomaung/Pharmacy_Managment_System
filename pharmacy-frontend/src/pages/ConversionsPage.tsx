import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { conversionsApi } from '../api/resources';
import type { DrugConversion } from '../api/types';
import { useConversions, useDrugs, useUnits } from '../hooks/queries';
import { Card, Spinner, Empty } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field } from '../components/Field';
import { NumInput } from '../components/NumInput';
import { toast, confirmDelete, apiError } from '../lib/alert';

const empty = { drugId: 0, fromUnitId: 0, toUnitId: 0, conversionFactor: 1 };

export default function ConversionsPage() {
  const { data, isLoading } = useConversions();
  const drugs = useDrugs();
  const units = useUnits();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const inv = () => qc.invalidateQueries({ queryKey: ['conversions'] });

  const openAdd = () => { setForm(empty); setOpen(true); };

  const save = useMutation({
    mutationFn: () => conversionsApi.create(form),
    onSuccess: () => { toast('Saved'); setOpen(false); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });
  const del = useMutation({
    mutationFn: (id: number) => conversionsApi.remove(id),
    onSuccess: () => { toast('Deleted'); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });

  const unitCode = (id: number) => units.data?.find((u) => u.unitId === id)?.unitCode ?? id;
  const cols: ColumnDef<DrugConversion>[] = [
    { id: 'drug', header: 'Drug', cell: ({ row }) => drugs.data?.find((d) => d.drugId === row.original.drugId)?.drugName ?? row.original.drugId },
    { id: 'fromUnit', header: 'From unit', cell: ({ row }) => unitCode(row.original.fromUnitId) },
    { id: 'toUnit', header: 'To unit', cell: ({ row }) => unitCode(row.original.toUnitId) },
    { header: 'Factor', accessorKey: 'conversionFactor' },
    { id: 'del', header: '', cell: ({ row }) => <button className="btn-danger px-2 py-1 text-xs" onClick={async () => { if (await confirmDelete('conversion')) del.mutate(row.original.conversionId); }}>Del</button> },
  ];

  return (
    <>
      <Card title="Unit conversions" action={<button className="btn-primary" onClick={openAdd}>+ Add Conversion</button>}>
        {isLoading ? <Spinner /> : !data?.length ? <Empty /> : <DataTable columns={cols} data={data} />}
      </Card>
      {open && (
        <Modal title="Add conversion (e.g. 1 Strip = 10 Tablets)" onClose={() => setOpen(false)}>
          <div className="grid gap-3">
            <Field label="Drug *"><select className="input" value={form.drugId} onChange={(e) => setForm({ ...form, drugId: Number(e.target.value) })}>
              <option value={0}>Select drug</option>{(drugs.data ?? []).map((d) => <option key={d.drugId} value={d.drugId}>{d.drugName}</option>)}
            </select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From unit *"><select className="input" value={form.fromUnitId} onChange={(e) => setForm({ ...form, fromUnitId: Number(e.target.value) })}>
                <option value={0}>From</option>{(units.data ?? []).map((u) => <option key={u.unitId} value={u.unitId}>{u.unitName} ({u.unitCode})</option>)}
              </select></Field>
              <Field label="To unit (base) *"><select className="input" value={form.toUnitId} onChange={(e) => setForm({ ...form, toUnitId: Number(e.target.value) })}>
                <option value={0}>To</option>{(units.data ?? []).map((u) => <option key={u.unitId} value={u.unitId}>{u.unitName} ({u.unitCode})</option>)}
              </select></Field>
            </div>
            <Field label="Conversion factor *" hint="How many 'to' units are in 1 'from' unit"><NumInput min={0} step="any" value={form.conversionFactor} onChange={(n) => setForm({ ...form, conversionFactor: n })} /></Field>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => save.mutate()}>Create</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
