import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { drugsApi } from '../api/resources';
import { useUnits } from '../hooks/queries';
import { Modal } from './Modal';
import { Field } from './Field';
import { NumInput } from './NumInput';
import { toast, apiError } from '../lib/alert';

/** Popup to create a drug that doesn't exist yet. Returns the new drug's id + defaults. */
export function QuickAddDrug({ onCreated, onClose }: { onCreated: (drug: { drugId: number; baseUnitId: number; sellingPrice: number; expiryDate?: string }) => void; onClose: () => void }) {
  const units = useUnits();
  const qc = useQueryClient();
  const [form, setForm] = useState({ drugName: '', genericName: '', category: '', baseUnitId: 0, sellingPrice: 0, expiryDate: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.drugName.trim()) return toast('Drug name is required', 'error');
    if (!form.baseUnitId) return toast('Pick a base unit', 'error');
    setSaving(true);
    try {
      const res = await drugsApi.create({
        drugName: form.drugName, genericName: form.genericName, category: form.category,
        baseUnitId: form.baseUnitId, sellingPrice: Number(form.sellingPrice),
        stockQuantity: 0, expiryDate: form.expiryDate || null,
      }) as { drugId?: number };
      await qc.invalidateQueries({ queryKey: ['drugs'] });
      toast('New drug added to database');
      onCreated({ drugId: res?.drugId ?? 0, baseUnitId: form.baseUnitId, sellingPrice: Number(form.sellingPrice), expiryDate: form.expiryDate || undefined });
      onClose();
    } catch (e) { toast(String(apiError(e)), 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Add new drug" onClose={onClose}>
      <div className="grid gap-3">
        <Field label="Drug name *"><input className="input" placeholder="e.g. Paracetamol 500mg" value={form.drugName} onChange={(e) => setForm({ ...form, drugName: e.target.value })} /></Field>
        <Field label="Generic name"><input className="input" placeholder="e.g. Acetaminophen" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} /></Field>
        <Field label="Category"><input className="input" placeholder="e.g. Painkiller, Antibiotic" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
        <Field label="Base unit *"><select className="input" value={form.baseUnitId} onChange={(e) => setForm({ ...form, baseUnitId: Number(e.target.value) })}>
          <option value={0}>Select base unit</option>
          {(units.data ?? []).map((u) => <option key={u.unitId} value={u.unitId}>{u.unitName} ({u.unitCode})</option>)}
        </select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Selling price"><NumInput min={0} value={form.sellingPrice} onChange={(n) => setForm({ ...form, sellingPrice: n })} /></Field>
          <Field label="Expiry date"><input type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Add drug'}</button>
        </div>
      </div>
    </Modal>
  );
}
