import { create } from 'zustand';
import type { SaleItem } from '../api/types';

interface CartState {
  items: SaleItem[];
  discount: number;
  add: (i: SaleItem) => void;
  update: (idx: number, i: SaleItem) => void;
  remove: (idx: number) => void;
  setDiscount: (d: number) => void;
  clear: () => void;
  total: () => number;
}

export const useSaleCart = create<CartState>()((set, get) => ({
  items: [],
  discount: 0,
  add: (i) => set({ items: [...get().items, i] }),
  update: (idx, i) => set({ items: get().items.map((it, x) => (x === idx ? i : it)) }),
  remove: (idx) => set({ items: get().items.filter((_, x) => x !== idx) }),
  setDiscount: (discount) => set({ discount }),
  clear: () => set({ items: [], discount: 0 }),
  total: () => get().items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
}));
