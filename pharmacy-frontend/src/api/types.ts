// Backend DTOs (match PharmacyManagemntWebApi.Models)
export interface User { userId: number; fullName: string; username: string; passwordHash: string; role: string; createdAt: string; }
export interface Unit { unitId: number; unitName: string; unitCode: string; createdAt: string; updatedAt?: string; deletedAt?: string; isDeleted: boolean; }
export interface Drug { drugId: number; drugName: string; genericName: string; category: string; baseUnitId: number; sellingPrice: number; stockQuantity: number; expiryDate?: string; createdAt: string; isDeleted: boolean; }
export interface DrugConversion { conversionId: number; drugId: number; fromUnitId: number; toUnitId: number; conversionFactor: number; }
export interface Supplier { supplierId: number; supplierName: string; contactPerson: string; phone: string; address: string; createdAt: string; isDeleted: boolean; }
export interface PurchaseItem { purchaseItemId?: number; purchaseId?: number; drugId: number; unitId: number; quantity: number; unitPrice: number; subtotal?: number; drugName?: string; unitCode?: string; expiryDate?: string; }
export interface Purchase { purchaseId: number; supplierId?: number; userId: number; purchaseDate: string; totalAmount: number; invoiceNumber: string; items: PurchaseItem[]; }
export interface SaleItem { saleItemId?: number; saleId?: number; drugId: number; unitId: number; quantity: number; unitPrice: number; subtotal?: number; drugName?: string; unitCode?: string; }
export interface Sale { saleId: number; userId: number; customerName: string; saleDate: string; totalAmount: number; discount: number; netAmount: number; paymentMethod: string; items: SaleItem[]; }
