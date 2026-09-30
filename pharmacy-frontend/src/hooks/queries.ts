import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversionsApi, drugsApi, purchasesApi, salesApi, suppliersApi, unitsApi, usersApi } from '../api/resources';
import type { Drug, DrugConversion, Purchase, Sale, Supplier, Unit, User } from '../api/types';

export const useUsers = () => useQuery<User[]>({ queryKey: ['users'], queryFn: usersApi.list });
export const useUnits = () => useQuery<Unit[]>({ queryKey: ['units'], queryFn: unitsApi.list });
export const useDrugs = () => useQuery<Drug[]>({ queryKey: ['drugs'], queryFn: drugsApi.list });
export const useSuppliers = () => useQuery<Supplier[]>({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
export const usePurchases = () => useQuery<Purchase[]>({ queryKey: ['purchases'], queryFn: purchasesApi.list });
export const useSales = () => useQuery<Sale[]>({ queryKey: ['sales'], queryFn: salesApi.list });
export const useConversions = () => useQuery<DrugConversion[]>({ queryKey: ['conversions'], queryFn: conversionsApi.list });
export const useConversionsByDrug = (drugId: number) =>
  useQuery<DrugConversion[]>({ queryKey: ['conversions', drugId], queryFn: () => conversionsApi.byDrug(drugId), enabled: drugId > 0 });

export const useInvalidate = (...keys: string[]) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {},
    onSettled: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
};
