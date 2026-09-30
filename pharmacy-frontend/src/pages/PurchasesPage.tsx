import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { purchasesApi } from '../api/resources';
import type { Purchase, PurchaseItem } from '../api/types';
import { useDrugs, usePurchases, useSuppliers, useUnits, useUsers } from '../hooks/queries';
import { useAuth } from '../store/auth';
import { Card, Spinner, Empty } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field } from '../components/Field';
import { QuickAddDrug } from '../components/QuickAddDrug';
import { toast, apiError } from '../lib/alert';

const strip = (it: PurchaseItem): PurchaseItem => ({
  drugId: it.drugId, unitId: it.unitId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice),
  expiryDate: it.expiryDate ? it.expiryDate : null as unknown as string,
});

export default function PurchasesPage() {
  const { data, isLoading } = usePurchases();
  const drugs = useDrugs();
  const units = useUnits();
  const suppliers = useSuppliers();
  const users = useUsers();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();

  // Bulk-fetch line details so the table can show lines / qty / units
  // (list API returns masters only; details cached 30s)
  const purchaseIds = useMemo(() => (data ?? []).map((p) => p.purchaseId), [data]);
  const detailQueries = useQueries({
    queries: purchaseIds.map((id) => ({
      queryKey: ['purchase', id],
      queryFn: () => purchasesApi.get(id) as Promise<Purchase>,
      staleTime: 30_000,
    })),
  });
  const detailsMap = useMemo(() => {
    const m = new Map<number, Purchase>();
    detailQueries.forEach((q, i) => { if (q.data) m.set(purchaseIds[i], q.data as Purchase); });
    return m;
  }, [detailQueries, purchaseIds]);

  const unitCodeOf = (unitId: number) => units.data?.find((u) => u.unitId === unitId)?.unitCode ?? `#${unitId}`;
  const linesOf = (id: number) => detailsMap.get(id)?.items?.length ?? 0;
  const qtyOf = (id: number) => (detailsMap.get(id)?.items ?? []).reduce((s, it) => s + Number(it.quantity || 0), 0);
  const unitsOf = (id: number) => {
    const items = detailsMap.get(id)?.items ?? [];
    if (!items.length) return '—';
    return [...new Set(items.map((it) => unitCodeOf(it.unitId)))].join(', ');
  };

  // Auto-generate invoice: INV-YYYYMMDD-### (next sequence for today, unique vs existing)
  const genInvoice = (existing: (string | null | undefined)[] = []) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `INV-${y}${m}${d}-`;
    let max = 0;
    for (const inv of existing) {
      if (typeof inv === 'string' && inv.startsWith(prefix)) {
        const n = parseInt(inv.slice(prefix.length), 10);
        if (Number.isFinite(n)) max = Math.max(max, n);
      }
    }
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  };

  const [open, setOpen] = useState(false);
  const [quickDrug, setQuickDrug] = useState(false);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [invoice, setInvoice] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [row, setRow] = useState({ drugId: 0, unitId: 0, quantity: 1, unitPrice: 0, expiryDate: '' as string });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ drugId: 0, unitId: 0, quantity: 1, unitPrice: 0, expiryDate: '' as string });

  const resetRow = () => setRow({ drugId: 0, unitId: 0, quantity: 1, unitPrice: 0, expiryDate: '' });
  const openAdd = () => { setItems([]); setInvoice(genInvoice((data ?? []).map((p) => p.invoiceNumber))); setSupplierId(''); resetRow(); setEditIndex(null); setOpen(true); };

  const pickDrug = (drugId: number) => {
    const d = drugs.data?.find((x) => x.drugId === drugId);
    setRow({ ...row, drugId, unitPrice: d?.sellingPrice ?? 0, unitId: d?.baseUnitId ?? row.unitId, expiryDate: '' });
  };

  const addLine = () => {
    if (!row.drugId || !row.unitId || !row.expiryDate) return toast('Pick drug + unit + expiry date', 'error');
    if (!row.quantity || Number(row.quantity) <= 0) return toast('Quantity must be > 0', 'error');
    if (Number(row.unitPrice) < 0) return toast('Buying price cannot be negative', 'error');
    const d = drugs.data?.find((x) => x.drugId === row.drugId);
    const u = units.data?.find((x) => x.unitId === row.unitId);
    const line: PurchaseItem = { ...row, quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), drugName: d?.drugName ?? `Drug #${row.drugId}`, unitCode: u?.unitCode ?? '' };
    setItems([...items, line]);
    resetRow(); // clear inputs for next line
  };

  const startEdit = (i: number) => {
    const it = items[i];
    if (!it) return;
    setEditForm({ drugId: it.drugId, unitId: it.unitId, quantity: it.quantity, unitPrice: it.unitPrice, expiryDate: (it.expiryDate ?? '').slice(0, 10) });
    setEditIndex(i);
  };

  const cancelEdit = () => setEditIndex(null);

  const pickEditDrug = (drugId: number) => {
    const d = drugs.data?.find((x) => x.drugId === drugId);
    setEditForm((f) => ({ ...f, drugId, unitPrice: d?.sellingPrice ?? f.unitPrice, unitId: d?.baseUnitId ?? f.unitId }));
  };

  const updateEdit = () => {
    if (editIndex == null) return;
    if (!editForm.drugId || !editForm.unitId || !editForm.expiryDate) return toast('Pick drug + unit + expiry date', 'error');
    if (!editForm.quantity || Number(editForm.quantity) <= 0) return toast('Quantity must be > 0', 'error');
    if (Number(editForm.unitPrice) < 0) return toast('Buying price cannot be negative', 'error');
    const d = drugs.data?.find((x) => x.drugId === editForm.drugId);
    const u = units.data?.find((x) => x.unitId === editForm.unitId);
    const line: PurchaseItem = { ...editForm, quantity: Number(editForm.quantity), unitPrice: Number(editForm.unitPrice), drugName: d?.drugName ?? `Drug #${editForm.drugId}`, unitCode: u?.unitCode ?? '' };
    setItems(items.map((it, idx) => (idx === editIndex ? line : it)));
    setEditIndex(null);
    toast('Line updated');
  };

  const removeLine = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
    if (editIndex === i) cancelEdit();
    else if (editIndex != null && i < editIndex) setEditIndex(editIndex - 1);
  };

  const create = useMutation({
    mutationFn: (payload: { supplierId: number | null; userId: number; purchaseDate: string; totalAmount: number; invoiceNumber: string; items: PurchaseItem[] }) =>
      purchasesApi.create(payload),
    onSuccess: () => {
      toast('Purchase saved, stock updated');
      setOpen(false);
      setItems([]);
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['drugs'] });
    },
    onError: (e) => toast(`Save failed: ${String(apiError(e))}`, 'error'),
  });

  const handleSave = () => {
    if (editIndex != null) return toast('Finish editing the current line first (Update or Cancel)', 'error');
    if (!items.length) {
      // Most common confusion: row filled but "+ Add line" never clicked
      if (row.drugId || row.unitId || row.quantity !== 1 || row.unitPrice !== 0 || row.expiryDate) {
        return toast('Click "+ Add line" first to add the current row to the purchase', 'error');
      }
      return toast('Add at least one line item', 'error');
    }
    const finalInvoice = invoice.trim() || genInvoice((data ?? []).map((p) => p.invoiceNumber));
    if (!invoice.trim()) setInvoice(finalInvoice);
    create.mutate({
      supplierId: supplierId === '' ? null : supplierId,
      userId: user?.userId ?? 1,
      purchaseDate: new Date().toISOString(),
      totalAmount: 0, invoiceNumber: finalInvoice, items: items.map(strip),
    });
  };

  const viewDetail = async (id: number) => {
    try {
      const p = (detailsMap.get(id) ?? await purchasesApi.get(id)) as Purchase;
      const sup = suppliers.data?.find((s) => s.supplierId === p.supplierId);
      const supplier = sup?.supplierName ?? '—';
      const supplierExtra = sup ? `${sup.contactPerson ? ` • Contact: ${sup.contactPerson}` : ''}${sup.phone ? ` • Tel: ${sup.phone}` : ''}${sup.address ? ` • ${sup.address}` : ''}` : '';
      const createdBy = users.data?.find((u) => u.userId === p.userId);
      const createdByText = createdBy ? `${createdBy.fullName} (${createdBy.username}${createdBy.role ? ` • ${createdBy.role}` : ''})` : `User #${p.userId}`;
      const esc = (s: unknown) => String(s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const unitText = (unitId: number) => {
        const u = units.data?.find((x) => x.unitId === unitId);
        return u ? esc(u.unitCode) : `#${unitId}`;
      };
      const drugCell = (drugId: number) => {
        const d = drugs.data?.find((x) => x.drugId === drugId);
        if (!d) return esc(`Drug #${drugId}`);
        const sub = [d.genericName, d.category].filter(Boolean).map(esc).join(' • ');
        return `${esc(d.drugName)}${sub ? `<br/><span style="color:#64748b;font-weight:400;font-size:12px">${sub}</span>` : ''}`;
      };
      const items = p.items ?? [];
      const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);
      const rows = items.map((it, idx) => {
        const expiry = it.expiryDate ? new Date(it.expiryDate).toLocaleDateString() : '—';
        const subtotal = (Number(it.quantity) * Number(it.unitPrice)).toFixed(0);
        return `<tr style="border-bottom:1px solid #eee">
          <td style="padding:6px 4px;color:#94a3b8">${idx + 1}</td>
          <td style="padding:6px 4px;font-weight:600">${drugCell(it.drugId)}</td>
          <td style="padding:6px 4px">${unitText(it.unitId)}</td>
          <td style="padding:6px 4px;text-align:right">${it.quantity}</td>
          <td style="padding:6px 4px;text-align:right">${Number(it.unitPrice).toFixed(0)}</td>
          <td style="padding:6px 4px;text-align:right;font-weight:600">${subtotal}</td>
          <td style="padding:6px 4px">${expiry}</td></tr>`;
      }).join('') || `<tr><td colspan="7" style="padding:12px;text-align:center;color:#94a3b8">No items</td></tr>`;
      Swal.fire({
        title: `Purchase #${id}`,
        html: `<div style="text-align:left;font-size:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px">
            <p><b>Invoice:</b> ${esc(p.invoiceNumber) || '—'}</p>
            <p><b>Date:</b> ${new Date(p.purchaseDate).toLocaleString()}</p>
            <p><b>Supplier:</b> ${esc(supplier)}<br/><span style="color:#64748b;font-size:12px">${esc(supplierExtra.replace(/^ • /, '')) || ''}</span></p>
            <p><b>Created by:</b> ${esc(createdByText)}</p>
            <p><b>Lines:</b> ${items.length} &nbsp; <b>Total qty:</b> ${totalQty}</p>
            <p><b>Total:</b> ${p.totalAmount} MMK</p>
          </div>
          <hr style="margin:8px 0"/>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f8fafc;text-align:left">
              <th style="padding:6px 4px">#</th><th style="padding:6px 4px">Drug (generic • category)</th>
              <th style="padding:6px 4px">Unit</th><th style="padding:6px 4px;text-align:right">Qty</th>
              <th style="padding:6px 4px;text-align:right">Price</th><th style="padding:6px 4px;text-align:right">Subtotal (MMK)</th>
              <th style="padding:6px 4px">Expiry</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="border-top:2px solid #e2e8f0;font-weight:700">
              <td colspan="3" style="padding:6px 4px">Total (${items.length} lines)</td>
              <td style="padding:6px 4px;text-align:right">${totalQty}</td>
              <td></td><td style="padding:6px 4px;text-align:right">${p.totalAmount} MMK</td><td></td></tr></tfoot></table></div>`,
        width: 860,
      });
    } catch (e) { toast(String(apiError(e)), 'error'); }
  };

  const supplierName = (supplierId?: number | null) =>
    supplierId == null ? '—' : (suppliers.data?.find((s) => s.supplierId === supplierId)?.supplierName ?? `#${supplierId}`);
  const userName = (userId: number) =>
    users.data?.find((u) => u.userId === userId)?.fullName ?? `User #${userId}`;

  const cols: ColumnDef<Purchase>[] = [
    { header: 'ID', accessorKey: 'purchaseId' },
    { header: 'Invoice no.', accessorKey: 'invoiceNumber' },
    { id: 'supplier', header: 'Supplier', cell: ({ row }) => supplierName(row.original.supplierId) },
    { id: 'lines', header: 'Lines', cell: ({ row }) => linesOf(row.original.purchaseId) || '—' },
    { id: 'qty', header: 'Total qty', cell: ({ row }) => qtyOf(row.original.purchaseId) || '—' },
    { id: 'units', header: 'Units', cell: ({ row }) => <span className="text-xs">{unitsOf(row.original.purchaseId)}</span> },
    { id: 'createdBy', header: 'Created by', cell: ({ row }) => userName(row.original.userId) },
    { id: 'total', header: 'Total', cell: ({ row }) => `${row.original.totalAmount} MMK` },
    { id: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.purchaseDate).toLocaleString() },
    { id: 'view', header: 'Details', cell: ({ row }) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => viewDetail(row.original.purchaseId)}>View</button> },
  ];

  return (
    <>
      <Card title="Purchases" action={<button className="btn-primary" onClick={openAdd}>+ New Purchase</button>}>
        {isLoading ? <Spinner /> : !data?.length ? <Empty /> : <DataTable columns={cols} data={data} />}
      </Card>

      {open && (
        <Modal title="New purchase (stock updates automatically, FEFO batches created)" size="2xl" onClose={() => setOpen(false)}>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Supplier"><select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">No supplier</option>{(suppliers.data ?? []).map((s) => <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>)}
              </select></Field>
              <Field label="Invoice number (auto)"><div className="flex gap-1">
                <input className="input" placeholder="auto" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
                <button className="btn-ghost shrink-0 px-2" type="button" title="Regenerate invoice number" onClick={() => setInvoice(genInvoice((data ?? []).map((p) => p.invoiceNumber)))}>↻</button>
              </div></Field>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Field label="Drug *">
                  <div className="flex gap-1">
                    <select className="input" value={row.drugId} onChange={(e) => pickDrug(Number(e.target.value))}>
                      <option value={0}>Select drug</option>{(drugs.data ?? []).map((d) => <option key={d.drugId} value={d.drugId}>{d.drugName} (Stock: {d.stockQuantity})</option>)}
                    </select>
                    <button className="btn-ghost shrink-0 px-2" title="Drug not in list? Add it" onClick={() => setQuickDrug(true)}>+</button>
                  </div>
                </Field>
                <Field label="Unit *"><select className="input" value={row.unitId} onChange={(e) => setRow({ ...row, unitId: Number(e.target.value) })}>
                  <option value={0}>Select unit</option>{(units.data ?? []).map((u) => <option key={u.unitId} value={u.unitId}>{u.unitName} ({u.unitCode})</option>)}
                </select></Field>
                <Field label="Quantity *"><input type="number" min={1} className="input" value={row.quantity} onChange={(e) => setRow({ ...row, quantity: Number(e.target.value) })} /></Field>
                <Field label="Buying price (MMK) *"><input type="number" min={0} className="input" placeholder="Cost per unit in MMK" value={row.unitPrice} onChange={(e) => setRow({ ...row, unitPrice: Number(e.target.value) })} /></Field>
                <Field label="Expiry date *"><input type="date" className="input" value={row.expiryDate ?? ''} onChange={(e) => setRow({ ...row, expiryDate: e.target.value })} /></Field>
              </div>
              <button className="btn-ghost mt-2 w-full" type="button" onClick={addLine}>+ Add line</button>
            </div>
            {items.map((it, i) => (
              <div key={i} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${editIndex === i ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <div className="min-w-0">
                  <p className="truncate font-medium">#{i + 1} {it.drugName ?? `Drug #${it.drugId}`}</p>
                  <p className="text-xs text-slate-500">{it.quantity}{it.unitCode ? ` ${it.unitCode}` : ''} × {it.unitPrice} MMK = <b className="text-slate-700">{(it.quantity * it.unitPrice).toFixed(0)} MMK</b>{it.expiryDate ? ` • Expires: ${new Date(it.expiryDate).toLocaleDateString()}` : ''}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="text-blue-600 hover:underline" type="button" onClick={() => startEdit(i)}>edit</button>
                  <button className="shrink-0 text-red-600 hover:underline" type="button" onClick={() => removeLine(i)}>remove</button>
                </div>
              </div>))}
            <p className="text-right text-sm font-bold">Total: {items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(0)} MMK</p>
            {!items.length && <p className="text-right text-xs text-amber-600">Fill Drug + Unit + Qty + Price + Expiry, then click “+ Add line” — Save stays disabled until at least 1 line is added.</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" type="button" disabled={create.isPending} title={!items.length ? 'Add at least one line item first' : 'Save purchase'} onClick={handleSave}>{create.isPending ? 'Saving…' : 'Save purchase'}</button>
            </div>
          </div>
        </Modal>
      )}

      {quickDrug && (
        <QuickAddDrug
          onClose={() => setQuickDrug(false)}
          onCreated={(d) => setRow((r) => ({ ...r, drugId: d.drugId, unitId: d.baseUnitId, unitPrice: d.sellingPrice, expiryDate: d.expiryDate ?? '' }))}
        />
      )}

      {editIndex != null && (
        <Modal title={`Edit line #${editIndex + 1}`} onClose={cancelEdit}>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Drug *"><select className="input" value={editForm.drugId} onChange={(e) => pickEditDrug(Number(e.target.value))}>
                <option value={0}>Select drug</option>{(drugs.data ?? []).map((d) => <option key={d.drugId} value={d.drugId}>{d.drugName} (Stock: {d.stockQuantity})</option>)}
              </select></Field>
              <Field label="Unit *"><select className="input" value={editForm.unitId} onChange={(e) => setEditForm({ ...editForm, unitId: Number(e.target.value) })}>
                <option value={0}>Select unit</option>{(units.data ?? []).map((u) => <option key={u.unitId} value={u.unitId}>{u.unitName} ({u.unitCode})</option>)}
              </select></Field>
              <Field label="Quantity *"><input type="number" min={1} className="input" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })} /></Field>
              <Field label="Buying price (MMK) *"><input type="number" min={0} className="input" value={editForm.unitPrice} onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Expiry date *"><input type="date" className="input" value={editForm.expiryDate ?? ''} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} /></Field>
            <p className="text-right text-sm font-bold">Line total: {(Number(editForm.quantity) * Number(editForm.unitPrice) || 0).toFixed(0)} MMK</p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" type="button" onClick={cancelEdit}>Cancel</button>
              <button className="btn-primary" type="button" onClick={updateEdit}>Update line</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
