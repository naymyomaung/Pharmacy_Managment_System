import { api, unwrap } from './client';
import type { Drug, DrugConversion, Purchase, Sale, Supplier, Unit, User } from './types';

const crud = <T>(path: string) => ({
  list: (): Promise<T[]> => unwrap<T[]>(api.get(`/${path}`)),
  get: (id: number): Promise<T> => unwrap<T>(api.get(`/${path}/${id}`)),
  create: (body: unknown): Promise<unknown> => api.post(`/${path}`, body).then((r) => r.data),
  update: (id: number, body: unknown): Promise<unknown> => api.put(`/${path}/${id}`, body).then((r) => r.data),
  remove: (id: number): Promise<unknown> => api.delete(`/${path}/${id}`).then((r) => r.data),
});

export const usersApi = crud<User>('Users');
export const unitsApi = crud<Unit>('Units');
export const drugsApi = crud<Drug>('Drugs');
export const suppliersApi = crud<Supplier>('Suppliers');
export const purchasesApi = crud<Purchase>('Purchases');
export const salesApi = crud<Sale>('Sales');
export const conversionsApi = {
  ...crud<DrugConversion>('DrugConversions'),
  byDrug: (drugId: number) => unwrap<DrugConversion[]>(api.get(`/DrugConversions/by-drug/${drugId}`)),
};
