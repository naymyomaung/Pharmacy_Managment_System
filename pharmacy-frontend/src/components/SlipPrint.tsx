import { createPortal } from 'react-dom';

export interface ReceiptItem { name: string; qty: number; unit: string; price: number; }
export interface Receipt { saleId: number; customer: string; payment: string; date: string; cashier: string; discount: number; items: ReceiptItem[]; }

/**
 * Hidden receipt slip portaled to document.body.
 * Screen: display:none. Print: everything else is hidden (see index.css),
 * so `window.print()` prints only this slip — no new tab or popup.
 * Fluid full-width layout: fills 80mm thermal paper and A4 alike.
 */
export function SlipPrint({ receipt }: { receipt: Receipt | null }) {
  if (!receipt) return null;
  const total = receipt.items.reduce((s, it) => s + it.qty * it.price, 0);
  const net = total - Number(receipt.discount || 0);
  return createPortal(
    <div id="slip-print-root" aria-hidden>
      <div className="slip">
        <p className="c shop">PHARMACY</p>
        <p className="c">Sales Receipt (80mm)</p>
        <hr className="sep" />
        <div className="r"><span>Receipt:</span><b>#{receipt.saleId}</b></div>
        <div className="r"><span>Date:</span><span>{receipt.date}</span></div>
        <div className="r"><span>Cashier:</span><span>{receipt.cashier}</span></div>
        <div className="r"><span>Customer:</span><span>{receipt.customer}</span></div>
        <div className="r"><span>Payment:</span><span>{receipt.payment}</span></div>
        <hr className="sep" />
        {receipt.items.map((it, i) => (
          <div key={i} className="item">
            <p className="iname">{it.name}</p>
            <div className="irow"><span>{it.qty} {it.unit} x {Number(it.price).toFixed(0)}</span><span>{(it.qty * it.price).toFixed(0)}</span></div>
          </div>
        ))}
        <hr className="sep" />
        <div className="r tot"><span>Total:</span><span>{total.toFixed(0)} MMK</span></div>
        <div className="r"><span>Discount:</span><span>{Number(receipt.discount || 0).toFixed(0)} MMK</span></div>
        <div className="r b"><span>Net:</span><span>{net.toFixed(0)} MMK</span></div>
        <p className="foot">Thank you! / Goods sold are non-returnable</p>
      </div>
    </div>,
    document.body,
  );
}
