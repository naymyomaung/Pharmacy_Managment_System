import { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { salesApi } from '../api/resources';
import type { Sale, SaleItem } from '../api/types';
import { useConversions, useDrugs, useSales, useUnits } from '../hooks/queries';
import { useAuth } from '../store/auth';
import { useSaleCart } from '../store/saleCart';
import { Card, Spinner, Empty } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field } from '../components/Field';
import { toast, apiError } from '../lib/alert';

export default function SalesPage() {
  const { data, isLoading } = useSales();
  const drugs = useDrugs();
  const units = useUnits();
  const conversions = useConversions();
  const user = useAuth((s) => s.user);
  const cart = useSaleCart();
  const qc = useQueryClient();

  const [customer, setCustomer] = useState('General Customer');
  const [payment, setPayment] = useState('Cash');
  const [row, setRow] = useState({ drugId: 0, unitId: 0, quantity: 1, unitPrice: 0 });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ drugId: 0, unitId: 0, quantity: 1, unitPrice: 0 });

  interface ReceiptItem { name: string; qty: number; unit: string; price: number; }
  interface Receipt { saleId: number; customer: string; payment: string; date: string; cashier: string; discount: number; items: ReceiptItem[]; }
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const pendingReceipt = useRef<Omit<Receipt, 'saleId'> | null>(null);

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
  const baseUnitOf = (drugId: number) => drugs.data?.find((d) => d.drugId === drugId)?.baseUnitId ?? 0;

  // Conversion theory: factor to convert sale unit -> drug base unit.
  // Returns 1 when same unit, exact factor otherwise, inverted reverse factor
  // as fallback (matches backend), null when no conversion either way.
  const factorFor = (drugId: number, fromUnitId: number): number | null => {
    const base = baseUnitOf(drugId);
    if (!drugId || !fromUnitId || !base) return null;
    if (fromUnitId === base) return 1;
    const exact = conversions.data?.find((x) => x.drugId === drugId && x.fromUnitId === fromUnitId && x.toUnitId === base);
    if (exact) return Number(exact.conversionFactor);
    const rev = conversions.data?.find((x) => x.drugId === drugId && x.fromUnitId === base && x.toUnitId === fromUnitId);
    if (rev && Number(rev.conversionFactor) !== 0) return 1 / Number(rev.conversionFactor);
    return null;
  };
  const baseQtyOf = (drugId: number, unitId: number, qty: number): number | null => {
    const f = factorFor(drugId, unitId);
    return f == null ? null : Math.floor(Number(qty) * f);
  };

  const selDrug = drugs.data?.find((x) => x.drugId === row.drugId);
  const onUnitChange = (unitId: number) => {
    const d = drugs.data?.find((x) => x.drugId === row.drugId);
    const f = row.drugId ? factorFor(row.drugId, unitId) : null;
    setRow({
      ...row,
      unitId,
      // Auto-convert price from base selling price so 1 STRP (10 TBL @100) => 1000
      unitPrice: d && f != null ? Math.round(Number(d.sellingPrice) * f) : row.unitPrice,
    });
  };
  const selFactor = row.drugId && row.unitId ? factorFor(row.drugId, row.unitId) : null;
  const selBaseQty = row.drugId && row.unitId && row.quantity ? baseQtyOf(row.drugId, row.unitId, row.quantity) : null;
  const selStock = selDrug?.stockQuantity ?? 0;
  const selBaseCode = selDrug ? unitCode(selDrug.baseUnitId) : '';

  const strip = (it: SaleItem): SaleItem => ({
    drugId: it.drugId, unitId: it.unitId, quantity: it.quantity, unitPrice: it.unitPrice,
  });

  const addToCart = () => {
    if (!row.drugId || !row.unitId) return toast('Pick drug + unit', 'error');
    if (!row.quantity || Number(row.quantity) <= 0) return toast('Quantity must be > 0', 'error');
    if (Number(row.unitPrice) < 0) return toast('Unit price cannot be negative', 'error');
    const d = drugs.data?.find((x) => x.drugId === row.drugId);
    const u = units.data?.find((x) => x.unitId === row.unitId);
    if (!d) return toast('Unknown drug', 'error');
    // Enforce conversion theory: non-base unit must have a defined conversion
    if (row.unitId !== d.baseUnitId) {
      const f = factorFor(row.drugId, row.unitId);
      if (f == null) {
        return toast(`No conversion ${u?.unitCode ?? row.unitId} → ${unitCode(d.baseUnitId)} for ${d.drugName}. Add it in Conversions first.`, 'error');
      }
      const need = Math.floor(Number(row.quantity) * f);
      if (need > d.stockQuantity) {
        return toast(`Insufficient stock: need ${need} ${unitCode(d.baseUnitId)} (= ${row.quantity} ${u?.unitCode ?? ''}), have ${d.stockQuantity}.`, 'error');
      }
    } else if (Number(row.quantity) > d.stockQuantity) {
      return toast(`Insufficient stock: have ${d.stockQuantity} ${unitCode(d.baseUnitId)}.`, 'error');
    }
    cart.add({ ...row, quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), drugName: d?.drugName ?? `Drug #${row.drugId}`, unitCode: u?.unitCode ?? '' });
    setRow({ drugId: 0, unitId: 0, quantity: 1, unitPrice: 0 });
  };

  const checkout = useMutation({
    mutationFn: (payload: { userId: number; customerName: string; saleDate: string; totalAmount: number; discount: number; netAmount: number; paymentMethod: string; items: SaleItem[] }) =>
      salesApi.create(payload),
    onSuccess: (res) => {
      const saleId = (res as { saleId?: number; SaleId?: number })?.saleId ?? (res as { SaleId?: number })?.SaleId ?? 0;
      if (pendingReceipt.current) {
        setReceipt({ ...pendingReceipt.current, saleId });
        pendingReceipt.current = null;
      }
      toast('Sale completed');
      cart.clear();
      qc.invalidateQueries({ queryKey: ['sales'] }); qc.invalidateQueries({ queryKey: ['drugs'] }); qc.invalidateQueries({ queryKey: ['purchase'] });
    },
    onError: (e) => toast(`Checkout failed: ${String(apiError(e))}`, 'error'),
  });

  const handleCheckout = () => {
    if (!cart.items.length) return toast('Cart is empty', 'error');
    // Re-validate every line against conversion + stock (prices may have changed)
    for (const it of cart.items) {
      const d = drugs.data?.find((x) => x.drugId === it.drugId);
      if (!d) return toast(`Unknown drug #${it.drugId}`, 'error');
      if (it.unitId !== d.baseUnitId) {
        const f = factorFor(it.drugId, it.unitId);
        if (f == null) return toast(`No conversion ${unitCode(it.unitId)} → ${unitCode(d.baseUnitId)} for ${d.drugName}.`, 'error');
        if (Math.floor(Number(it.quantity) * f) > d.stockQuantity)
          return toast(`Insufficient stock for ${d.drugName}: need ${Math.floor(Number(it.quantity) * f)} ${unitCode(d.baseUnitId)}, have ${d.stockQuantity}.`, 'error');
      } else if (Number(it.quantity) > d.stockQuantity) {
        return toast(`Insufficient stock for ${d.drugName}: have ${d.stockQuantity}.`, 'error');
      }
    }
    checkout.mutate({
      userId: user?.userId ?? 1, customerName: customer,
      saleDate: new Date().toISOString(), totalAmount: 0,
      discount: cart.discount, netAmount: 0, paymentMethod: payment, items: cart.items.map(strip),
    });
    // Snapshot receipt lines before cart is cleared on success
    pendingReceipt.current = {
      customer, payment,
      date: new Date().toLocaleString(),
      cashier: user?.username ?? 'cashier',
      discount: cart.discount,
      items: cart.items.map((it) => ({
        name: it.drugName ?? drugs.data?.find((d) => d.drugId === it.drugId)?.drugName ?? `Drug #${it.drugId}`,
        qty: Number(it.quantity), unit: it.unitCode ?? '', price: Number(it.unitPrice),
      })),
    };
  };

  const escHtml = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Thermal slip print (80mm). Opens a print-sized window so the OS print
  // dialog defaults to the receipt width; user picks the thermal printer.
  const printReceipt = (r: Receipt) => {
    const total = r.items.reduce((s, it) => s + it.qty * it.price, 0);
    const net = total - Number(r.discount || 0);
    const lines = r.items.map((it) => {
      const amt = (it.qty * it.price).toFixed(0);
      return `<div class="item"><div class="iname">${escHtml(it.name)}</div>`
        + `<div class="irow"><span>${it.qty} ${escHtml(it.unit)} x ${Number(it.price).toFixed(0)}</span><span>${amt}</span></div></div>`;
    }).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sale #${r.saleId}</title><style>`
      + `@page{size:80mm auto;margin:0}*{box-sizing:border-box}`
      + `body{width:80mm;margin:0;padding:3mm 3mm 5mm;font-family:'Courier New',monospace;font-size:12px;color:#000}`
      + `.c{text-align:center}.r{display:flex;justify-content:space-between}.b{font-weight:bold}`
      + `.shop{font-size:15px;font-weight:bold}.sep{border-top:1px dashed #000;margin:6px 0}`
      + `.item{margin:3px 0}.iname{font-weight:bold;word-break:break-word}.irow{display:flex;justify-content:space-between}`
      + `.tot{margin-top:2px}.foot{margin-top:8px;text-align:center;font-size:11px}`
      + `</style></head><body>`
      + `<div class="c shop">PHARMACY</div><div class="c">Sales Receipt (80mm)</div><div class="sep"></div>`
      + `<div class="r"><span>Receipt:</span><span class="b">#${r.saleId}</span></div>`
      + `<div class="r"><span>Date:</span><span>${escHtml(r.date)}</span></div>`
      + `<div class="r"><span>Cashier:</span><span>${escHtml(r.cashier)}</span></div>`
      + `<div class="r"><span>Customer:</span><span>${escHtml(r.customer)}</span></div>`
      + `<div class="r"><span>Payment:</span><span>${escHtml(r.payment)}</span></div>`
      + `<div class="sep"></div>${lines}<div class="sep"></div>`
      + `<div class="r tot"><span>Total:</span><span>${total.toFixed(0)} MMK</span></div>`
      + `<div class="r"><span>Discount:</span><span>${Number(r.discount || 0).toFixed(0)} MMK</span></div>`
      + `<div class="r b"><span>Net:</span><span>${net.toFixed(0)} MMK</span></div>`
      + `<div class="foot">Thank you! / Goods sold are non-returnable</div>`
      + `<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script>`
      + `</body></html>`;
    const w = window.open('', '_blank', 'width=320,height=600');
    if (!w) return toast('Popup blocked — allow popups to print', 'error');
    w.document.write(html);
    w.document.close();
  };

  const startEdit = (i: number) => {
    const it = cart.items[i];
    if (!it) return;
    setEditForm({ drugId: it.drugId, unitId: it.unitId, quantity: it.quantity, unitPrice: it.unitPrice });
    setEditIndex(i);
  };
  const cancelEdit = () => setEditIndex(null);
  const pickEditUnit = (unitId: number) => {
    const d = drugs.data?.find((x) => x.drugId === editForm.drugId);
    const f = editForm.drugId ? factorFor(editForm.drugId, unitId) : null;
    setEditForm((frm) => ({
      ...frm,
      unitId,
      unitPrice: d && f != null ? Math.round(Number(d.sellingPrice) * f) : frm.unitPrice,
    }));
  };
  const updateEdit = () => {
    if (editIndex == null) return;
    if (!editForm.drugId || !editForm.unitId) return toast('Pick drug + unit', 'error');
    if (!editForm.quantity || Number(editForm.quantity) <= 0) return toast('Quantity must be > 0', 'error');
    if (Number(editForm.unitPrice) < 0) return toast('Unit price cannot be negative', 'error');
    const d = drugs.data?.find((x) => x.drugId === editForm.drugId);
    const u = units.data?.find((x) => x.unitId === editForm.unitId);
    if (!d) return toast('Unknown drug', 'error');
    if (editForm.unitId !== d.baseUnitId) {
      const f = factorFor(editForm.drugId, editForm.unitId);
      if (f == null) return toast(`No conversion ${u?.unitCode ?? editForm.unitId} → ${unitCode(d.baseUnitId)} for ${d.drugName}.`, 'error');
      if (Math.floor(Number(editForm.quantity) * f) > d.stockQuantity)
        return toast(`Insufficient stock: need ${Math.floor(Number(editForm.quantity) * f)} ${unitCode(d.baseUnitId)}, have ${d.stockQuantity}.`, 'error');
    } else if (Number(editForm.quantity) > d.stockQuantity) {
      return toast(`Insufficient stock: have ${d.stockQuantity}.`, 'error');
    }
    cart.update(editIndex, { ...editForm, quantity: Number(editForm.quantity), unitPrice: Number(editForm.unitPrice), drugName: d.drugName, unitCode: u?.unitCode ?? '' });
    setEditIndex(null);
    toast('Cart line updated');
  };

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
    { id: 'view', header: 'Details', cell: ({ row }) => <button className="btn-ghost px-2 py-1 text-xs" type="button" onClick={() => viewDetail(row.original.saleId)}>View</button> },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="POS — New sale (stock OUT)">
        <div className="grid gap-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Customer name"><input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. General Customer" /></Field>
            <Field label="Payment method"><select className="input" value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option>Cash</option><option>Card</option><option>Mobile</option>
            </select></Field>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-4">
            <Field label="Drug *"><select className="input" value={row.drugId} onChange={(e) => {
              const d = drugs.data?.find((x) => x.drugId === Number(e.target.value));
              setRow({ ...row, drugId: Number(e.target.value), unitPrice: d?.sellingPrice ?? 0, unitId: d?.baseUnitId ?? row.unitId });
            }}>
              <option value={0}>Select drug</option>{(drugs.data ?? []).map((d) => <option key={d.drugId} value={d.drugId}>{d.drugName} ({d.stockQuantity})</option>)}
            </select></Field>
            <Field label="Unit *"><select className="input" value={row.unitId} onChange={(e) => onUnitChange(Number(e.target.value))}>
              <option value={0}>Select unit</option>{(units.data ?? []).map((u) => <option key={u.unitId} value={u.unitId}>{u.unitName} ({u.unitCode})</option>)}
            </select></Field>
            <Field label="Quantity *"><input type="number" min={1} className="input" value={row.quantity} onChange={(e) => setRow({ ...row, quantity: Number(e.target.value) })} /></Field>
            <Field label="Unit price (MMK) *"><input type="number" min={0} className="input" value={row.unitPrice} onChange={(e) => setRow({ ...row, unitPrice: Number(e.target.value) })} /></Field>
          </div>
          {selDrug && row.unitId > 0 && selFactor != null && row.unitId !== selDrug.baseUnitId && (
            <p className="-mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
              Price auto-converted: {Number(selDrug.sellingPrice).toFixed(0)} {selBaseCode} × {selFactor} = <b>{Math.round(Number(selDrug.sellingPrice) * selFactor)} {unitCode(row.unitId)}</b> (editable)
            </p>
          )}
          <button className="btn-ghost" type="button" onClick={addToCart}>+ Add to cart</button>
          {row.drugId > 0 && row.unitId > 0 && (
            selFactor == null ? (
              <p className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">
                No conversion {unitCode(row.unitId)} → {selBaseCode || 'base'} for {selDrug?.drugName ?? `#${row.drugId}`}. Backend would deduct 1:1 (wrong). Add it in Conversions first.
              </p>
            ) : row.unitId === (selDrug?.baseUnitId ?? row.unitId) ? (
              <p className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                {row.quantity} {unitCode(row.unitId)} (base unit) • Stock: {selStock} {selBaseCode}
                {selBaseQty != null && selBaseQty > selStock ? <b className="text-red-600"> — insufficient!</b> : null}
              </p>
            ) : (
              <p className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-800">
                {row.quantity} {unitCode(row.unitId)} × {selFactor} = <b>{selBaseQty} {selBaseCode}</b> will be deducted (FEFO) • Stock: {selStock} {selBaseCode}
                {selBaseQty != null && selBaseQty > selStock ? <b className="text-red-600"> — insufficient!</b> : null}
              </p>
            )
          )}
          {cart.items.map((it, i) => {
            const bq = baseQtyOf(it.drugId, it.unitId, it.quantity);
            const base = baseUnitOf(it.drugId);
            const showConv = base && it.unitId !== base && bq != null;
            return (
              <div key={i} className={`flex justify-between rounded-lg border px-2 py-1 text-sm ${editIndex === i ? 'border-blue-400 bg-blue-50' : ''}`}>
                <span>{it.drugName ?? drugs.data?.find((d) => d.drugId === it.drugId)?.drugName ?? `Drug #${it.drugId}`} × {it.quantity}{it.unitCode ? ` ${it.unitCode}` : ''}{showConv ? ` (= ${bq} ${unitCode(base)})` : ''} @ {it.unitPrice} MMK</span>
                <span className="flex shrink-0 gap-2">
                  <button className="text-blue-600 hover:underline" type="button" onClick={() => startEdit(i)}>edit</button>
                  <button className="text-red-600 hover:underline" type="button" onClick={() => cart.remove(i)}>remove</button>
                </span>
              </div>);
          })}
          <div className="flex items-center justify-between text-sm">
            <Field label="Discount (MMK)"><input type="number" min={0} className="input w-28" value={cart.discount} onChange={(e) => cart.setDiscount(Number(e.target.value))} /></Field>
            <b>Total: {(cart.total() - cart.discount).toFixed(0)} MMK</b>
          </div>
          <button className="btn-primary" type="button" disabled={!cart.items.length || checkout.isPending} onClick={handleCheckout}>{checkout.isPending ? 'Processing…' : 'Checkout'}</button>
        </div>
      </Card>
      <Card title="Sales history">
        {isLoading ? <Spinner /> : !data?.length ? <Empty /> : <DataTable columns={cols} data={data} />}
      </Card>

      {receipt && (
        <Modal title={`Sale #${receipt.saleId} completed`} onClose={() => setReceipt(null)}>
          <div className="grid gap-3">
            {/* 80mm slip preview (80mm ≈ 302px) */}
            <div className="mx-auto w-[280px] bg-white p-3 font-mono text-xs text-black shadow-inner">
              <p className="text-center text-sm font-bold">PHARMACY</p>
              <p className="text-center">Sales Receipt (80mm)</p>
              <hr className="my-2 border-dashed border-black" />
              <div className="flex justify-between"><span>Receipt:</span><b>#{receipt.saleId}</b></div>
              <div className="flex justify-between"><span>Date:</span><span>{receipt.date}</span></div>
              <div className="flex justify-between"><span>Cashier:</span><span>{receipt.cashier}</span></div>
              <div className="flex justify-between"><span>Customer:</span><span>{receipt.customer}</span></div>
              <div className="flex justify-between"><span>Payment:</span><span>{receipt.payment}</span></div>
              <hr className="my-2 border-dashed border-black" />
              {receipt.items.map((it, i) => (
                <div key={i} className="my-1">
                  <p className="break-words font-bold">{it.name}</p>
                  <div className="flex justify-between"><span>{it.qty} {it.unit} x {Number(it.price).toFixed(0)}</span><span>{(it.qty * it.price).toFixed(0)}</span></div>
                </div>
              ))}
              <hr className="my-2 border-dashed border-black" />
              <div className="flex justify-between"><span>Total:</span><span>{receipt.items.reduce((s, it) => s + it.qty * it.price, 0).toFixed(0)} MMK</span></div>
              <div className="flex justify-between"><span>Discount:</span><span>{Number(receipt.discount || 0).toFixed(0)} MMK</span></div>
              <div className="flex justify-between font-bold"><span>Net:</span><span>{(receipt.items.reduce((s, it) => s + it.qty * it.price, 0) - Number(receipt.discount || 0)).toFixed(0)} MMK</span></div>
              <p className="mt-2 text-center">Thank you!</p>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" type="button" onClick={() => setReceipt(null)}>Close</button>
              <button className="btn-primary" type="button" onClick={() => printReceipt(receipt)}>🖨 Print 80mm slip</button>
            </div>
          </div>
        </Modal>
      )}

      {editIndex != null && (
        <Modal title={`Edit cart line #${editIndex + 1}`} onClose={cancelEdit}>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Drug *"><select className="input" value={editForm.drugId} onChange={(e) => {
                const d = drugs.data?.find((x) => x.drugId === Number(e.target.value));
                setEditForm((f) => ({ ...f, drugId: Number(e.target.value), unitPrice: d?.sellingPrice ?? f.unitPrice, unitId: d?.baseUnitId ?? f.unitId }));
              }}>
                <option value={0}>Select drug</option>{(drugs.data ?? []).map((d) => <option key={d.drugId} value={d.drugId}>{d.drugName} ({d.stockQuantity})</option>)}
              </select></Field>
              <Field label="Unit *"><select className="input" value={editForm.unitId} onChange={(e) => pickEditUnit(Number(e.target.value))}>
                <option value={0}>Select unit</option>{(units.data ?? []).map((u) => <option key={u.unitId} value={u.unitId}>{u.unitName} ({u.unitCode})</option>)}
              </select></Field>
              <Field label="Quantity *"><input type="number" min={1} className="input" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })} /></Field>
              <Field label="Unit price (MMK) *"><input type="number" min={0} className="input" value={editForm.unitPrice} onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })} /></Field>
            </div>
            <p className="text-right text-sm font-bold">Line total: {(Number(editForm.quantity) * Number(editForm.unitPrice) || 0).toFixed(0)} MMK</p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" type="button" onClick={cancelEdit}>Cancel</button>
              <button className="btn-primary" type="button" onClick={updateEdit}>Update line</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
