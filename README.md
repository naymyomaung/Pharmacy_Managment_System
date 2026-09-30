# Pharmacy Management System — Full Project Summary

Full-stack pharmacy inventory + POS system.

- **Backend:** `PharmacyManagemntWebApi/` — ASP.NET Core 8 Web API, Dapper, SQL Server (`.\SQLEXPRESS`)
- **Frontend:** `pharmacy-frontend/` — React 18 + Vite + TypeScript + Tailwind + TanStack Query/Table + Zustand + Axios
- **Database:** `PharmacyMS_DB` (SQL Server) — 10 tables, FEFO batch tracking, computed totals

```
PharmacyManagemntWebApi/
├── PharmacyManagemntWebApi/          # .NET 8 API
│   ├── Controllers/ (7 controllers, 36 endpoints)
│   ├── Models/ (User, UnitModles, Drug, DrugConversion, Supplier, Purchase, Sale, DrugBatch)
│   ├── Repository/ (7 Dapper repos)
│   ├── Queries/ (7 raw-SQL classes)
│   ├── Data/IDBConnectionFactory.cs
│   ├── Database/PharmacyMS_DB_Tables.sql  # full create script
│   ├── DatabaseMigrations.sql             # FEFO migration
│   ├── Program.cs / appsettings.json / launchSettings
├── pharmacy-frontend/                # React SPA
│   ├── src/api/ (client, resources, types)
│   ├── src/pages/ (Login, Dashboard, Users, Units, Drugs, Conversions, Suppliers, Purchases, Sales)
│   ├── src/pages/reports/ (Sales, Purchases, Closing)
│   ├── src/store/ (auth, saleCart, ui)
│   ├── src/components/ / hooks/ / lib/ / routes/
└── PharmacyManagemntWebApi.slnx
```

---

## 1. Tech Stack

| Layer | Tech |
|---|---|
| Backend | .NET 8 (`net8.0`, `Nullable enable`, `ImplicitUsings`), ASP.NET Core Web API, Dapper 2.1.89, `Microsoft.Data.SqlClient`, Swashbuckle 6.6.2, EFCore.SqlServer 8.0.31 referenced but **not used** (no DbContext) |
| DB | SQL Server `.\SQLEXPRESS`, database `PharmacyMS_DB`, `Trusted_Connection=true` |
| Frontend | React 18.3, react-router-dom 6.24, axios 1.7, @tanstack/react-query 5.51, @tanstack/react-table 8.19, zustand 4.5, sweetalert2 11.12, xlsx 0.18.5, Vite 5.4, Tailwind 3.4, TypeScript 5.5 |
| Ports | API: `http://localhost:5084` / `https://localhost:7149` (see `Properties/launchSettings.json`); Frontend: `http://localhost:5173` (`vite.config.ts`), `VITE_API_URL=http://10.10.0.52:5084/api` in `.env` |

---

## 2. Backend — `PharmacyManagemntWebApi/`

### 2.1 Program.cs / DI / CORS

`PharmacyManagemntWebApi/Program.cs:10-22`:
`AddControllers`, `AddEndpointsApiExplorer`, `AddSwaggerGen`, scoped `IDbConnectionFactory → DbConnectionFactory` + 7 repos (`UnitRepo, UserRepo, DrugRepo, DrugConversionRepo, SupplierRepo, PurchaseRepo, SaleRepo`).

CORS policy `Frontend` (`Program.cs:23-56`): allows any `localhost/127.0.0.1` http/https any port + private LAN `10/8, 192.168/16, 172.16/12`, `AllowAnyHeader/Method` (no credentials). Pipeline: Swagger only in Development → `UseHttpsRedirection` → `UseCors` → `UseAuthorization` (no Authentication) → `MapControllers`.

Connection string (`appsettings.json:10`):
```
Server=.\SQLEXPRESS;Database=PharmacyMS_DB;Trusted_Connection=true;TrustServerCertificate=true;
```

### 2.2 Controllers — 36 endpoints, prefix `api/[controller]`, no `[Authorize]`

| Controller | Endpoints |
|---|---|
| `UsersController` (`Controllers/UsersController.cs`) | `GET api/Users` list · `GET api/Users/{id}` · `POST api/Users` → 201 `CreatedAtAction(GetById)` · `PUT api/Users/{id}` → 204/404 · `DELETE api/Users/{id}` hard delete |
| `UnitsController` | `GET api/Units` (404 `No units found` if empty) · `GET api/Units/{id}` · `POST api/Units` · `PUT api/Units/{id}` · `DELETE api/Units/{id}` → soft delete (`IsDeleted=1`) |
| `SuppliersController` | `GET api/Suppliers` · `GET api/Suppliers/{id}` · `POST api/Suppliers` · `PUT api/Suppliers/{id}` · `DELETE api/Suppliers/{id}` → soft delete |
| `DrugsController` | `GET api/Drugs` (non-deleted) · `GET api/Drugs/{id}` · `GET api/Drugs/{id}/batches` (FEFO batches, always 200) · `POST api/Drugs` · `PUT api/Drugs/{id}` · `DELETE api/Drugs/{id}` → soft delete |
| `DrugConversionsController` | `GET api/DrugConversions` · `GET api/DrugConversions/{id}` · `GET api/DrugConversions/by-drug/{drugId}` (always 200 list) · `POST api/DrugConversions` · `PUT api/DrugConversions/{id}` · `DELETE api/DrugConversions/{id}` hard delete |
| `PurchasesController` (no PUT) | `GET api/Purchases` (masters only) · `GET api/Purchases/{id}` (master + `Items`) · `POST api/Purchases` (try/catch → 201 `{PurchaseId}` or 400 `ex.Message`, auto stock-IN + `DrugBatches` insert) · `DELETE api/Purchases/{id}` (transactional: delete batches → reverse stock → delete items+master) |
| `SalesController` (no PUT) | `GET api/Sales` · `GET api/Sales/{id}` (master + `Items`) · `POST api/Sales` (FEFO stock-out, 201 `{SaleId}` or 400) · `DELETE api/Sales/{id}` (deletes items+master, **does NOT restore stock**) |

### 2.3 Models (`Models/`)

- `User.cs`: `UserId, FullName, Username, PasswordHash, Role=Cashier (Admin/Pharmacist/Cashier), CreatedAt=Now`
- `UnitModles.cs` (typo in name): `UnitId, UnitName, UnitCode, CreatedAt, UpdatedAt?, DeletedAt?, IsDeleted`
- `Supplier.cs`: `SupplierId, SupplierName, ContactPerson, Phone, Address, CreatedAt=Now, IsDeleted=false`
- `Drug.cs`: `DrugId, DrugName, GenericName, Category, BaseUnitId, SellingPrice, StockQuantity=0, ExpiryDate?, CreatedAt=Now, IsDeleted=false`
- `DrugConversion.cs`: `ConversionId, DrugId, FromUnitId, ToUnitId, ConversionFactor`
- `Purchase.cs`: `Purchase(PurchaseId, SupplierId?, UserId, PurchaseDate=Now, TotalAmount, InvoiceNumber, Items)` + `PurchaseItem(PurchaseItemId, PurchaseId, DrugId, UnitId, Quantity, UnitPrice, Subtotal, ExpiryDate?)` + `DrugBatch(BatchId, DrugId, PurchaseItemId, ExpiryDate?, Quantity(base-unit remaining), UnitId, CreatedAt)` + `SaleBatchDeduction(BatchId, Quantity)` helper
- `Sale.cs`: `Sale(SaleId, UserId, CustomerName=General Customer, SaleDate=Now, TotalAmount, Discount=0, NetAmount, PaymentMethod=Cash, Items)` + `SaleItem(SaleItemId, SaleId, DrugId, UnitId, Quantity, UnitPrice, Subtotal)`
- `DrugModels.cs`: legacy/unused DTO (`DrugId, DrugName, GenericName`)

### 2.4 Data + Repository + Queries (Dapper, no EF DbContext)

`Data/IDBConnectionFactory.cs`: `IDbConnectionFactory.CreateConnection()` → `new SqlConnection(DefaultConnection)`.

All repos inject `IDbConnectionFactory`, use Dapper `QueryAsync/ExecuteAsync/ExecuteScalarAsync` in transactions where needed. SQL lives in `Queries/`:

- `UserQuery`: GetAll/ById/ByUsername, `Insert OUTPUT INSERTED.UserId`, Update, hard Delete
- `UnitQuery`: `WHERE IsDeleted=0`, Insert (`GETDATE(),0 OUTPUT UnitId`), Update (`UpdatedAt=GETDATE()`), SoftDelete (`IsDeleted=1,DeletedAt`)
- `SupplierQuery`: same soft-delete pattern
- `DrugQuery`: `IsDeleted=0` filter, Insert/Update/SoftDelete, `UpdateStock (+@QtyChange)`, `GetStock`
- `DrugConversionQuery`: GetAll/ById/ByDrugId, `GetFactor WHERE Drug+From+To`, Insert/Update/Delete
- `SaleQuery`: `Insert OUTPUT SaleId` (**does not insert `NetAmount` — computed column**), `GetItemsBySaleId`, `InsertItem` (no Subtotal — computed), Delete
- `PurchaseQuery` + `DrugBatchQuery`: `Insert OUTPUT PurchaseId/PurchaseItemId/BatchId`, `GetBatchesByDrugId (Quantity>0 ORDER BY Expiry ASC, CreatedAt ASC)` = FEFO order, `UpdateBatchQuantity (Quantity-=Qty)`, `DeleteEmptyBatches (Quantity<=0)`

Key logic:
- `PurchaseRepo.CreateAsync`: recalc `Subtotal/TotalAmount`, insert master → items, resolve unit→base factor (`GetFactor`, fallback `1/reverse`), `UPDATE Drugs StockQuantity+=baseQty`, `INSERT DrugBatches` (try/catch for missing table).
- `SaleRepo.CreateAsync`: recalc `Subtotal/Total/Net=Total-Discount`, pre-validate stock (`batches.Sum` fallback `Drugs.StockQuantity`, throw if `available<baseQty` or factor zero), insert master+items, deduct batches `ORDER BY Expiry ASC`, `UPDATE Drugs Stock-=`, delete empty batches.

---

## 3. Database — `PharmacyMS_DB`

Scripts:
- `Database/PharmacyMS_DB_Tables.sql` (151 lines) — full create (`IF DB_ID NULL CREATE`), all tables + seeds
- `DatabaseMigrations.sql` (78 lines) — FEFO upgrade: `ALTER PurchaseItems ADD ExpiryDate`, `CREATE DrugBatches` + indexes, backfill

### 3.1 Schema (10 tables)

```
Users 1──* Purchases *──* Drugs (via PurchaseItems)
Users 1──* Sales *──* Drugs (via SaleItems)
Suppliers 1──* Purchases
Units 1──* Drugs.BaseUnitId
Units 1──* DrugConversions.FromUnitId / ToUnitId
Drugs 1──* DrugConversions
Drugs 1──* DrugBatches (FEFO stock lots, FK PurchaseItems)
Purchases 1──* PurchaseItems
Sales 1──* SaleItems
```

| Table | Key columns |
|---|---|
| `Users` | `UserId PK IDENTITY, FullName NVARCHAR(100), Username NVARCHAR(50) UNIQUE, PasswordHash NVARCHAR(255), Role CHECK(Admin/Pharmacist/Cashier), CreatedAt DEFAULT GETDATE()` |
| `Units` | `UnitId PK, UnitName, UnitCode UNIQUE, CreatedAt/UpdatedAt/DeletedAt, IsDeleted DEFAULT 0` |
| `Drugs` | `DrugId PK, DrugName, GenericName, Category, BaseUnitId FK→Units, SellingPrice DECIMAL(18,2), StockQuantity INT (base-unit total), ExpiryDate DATE, CreatedAt, IsDeleted` |
| `DrugConversions` | `ConversionId PK, DrugId FK→Drugs, FromUnitId FK→Units, ToUnitId FK→Units, ConversionFactor DECIMAL(18,4) CHECK(>0), UQ(DrugId,FromUnitId,ToUnitId)` — e.g. `1 Strip = 10 Tablet` |
| `Suppliers` | `SupplierId PK, SupplierName, ContactPerson, Phone, Address, CreatedAt, IsDeleted` |
| `Purchases` | `PurchaseId PK, SupplierId NULL FK→Suppliers, UserId FK→Users, PurchaseDate DEFAULT GETDATE(), TotalAmount, InvoiceNumber` |
| `PurchaseItems` | `PurchaseItemId PK, PurchaseId FK, DrugId FK, UnitId FK, Quantity, UnitPrice, Subtotal AS (Quantity*UnitPrice) PERSISTED, ExpiryDate DATE` |
| `DrugBatches` | `BatchId PK, DrugId FK, PurchaseItemId FK (NULL in full script, NOT NULL in migration), ExpiryDate DATE/DATETIME, Quantity INT (remaining base units), UnitId FK, CreatedAt` + `IX_DrugBatches_DrugId_ExpiryDate`, `IX_DrugBatches_PurchaseItemId` |
| `Sales` | `SaleId PK, UserId FK, CustomerName DEFAULT General Customer, SaleDate, TotalAmount, Discount DEFAULT 0, NetAmount AS (TotalAmount-Discount) PERSISTED, PaymentMethod DEFAULT Cash` |
| `SaleItems` | `SaleItemId PK, SaleId FK, DrugId FK, UnitId FK, Quantity, UnitPrice, Subtotal AS (Quantity*UnitPrice) PERSISTED` |

Seeds: Units `Tablet/TBL, Strip/STRP, Box/BOX, Bottle/BTL`; User `admin / admin123` (SHA256 `240be518...`).

Note: `NetAmount/Subtotal` are persisted computed columns — repos must not insert them. `ExpiryDate` type is `DATE` in base script vs `DATETIME` in migration script.

---

## 4. Frontend — `pharmacy-frontend/`

### 4.1 Config

- `VITE_API_URL`: `.env` = `http://10.10.0.52:5084/api` (LAN), `.env.example` = `http://localhost:5084/api`; `src/api/client.ts` = `axios.create({baseURL: VITE_API_URL ?? localhost:5084/api})`, no interceptors, no `Authorization` header.
- `vite.config.ts`: `react()`, port `5173`. `tailwind.config.js`: `brand` green palette + `clinic{bg,ink,muted,line,accent}`, custom shadows. `index.html` title `MediCare Pharmacy — Clinic Management`.
- `src/main.tsx`: `QueryClient(retry:1, refetchOnWindowFocus:false)` + `<App/>`.

### 4.2 Routes (`src/routes/router.tsx`) — all guarded except `/login`

`Guard` checks `useAuth(user)` else `<Navigate to=/login>`, wraps in `AppLayout` (sidebar + topbar).

| Route | Page | Backend calls |
|---|---|---|
| `/login` | `pages/Login.tsx` | `GET /Users`, client-side `find(username)` |
| `/` | `pages/Dashboard.tsx` | `GET /Drugs,/Sales,/Purchases,/Suppliers` |
| `/users` | `pages/UsersPage.tsx` | CRUD `GET/POST /Users, PUT/DELETE /Users/:id` |
| `/units` | `pages/UnitsPage.tsx` | CRUD `/Units` |
| `/drugs` | `pages/DrugsPage.tsx` | `GET /Drugs`, `PUT /Drugs/:id` (price+expiry only), `DELETE /Drugs/:id` (no create UI — create via Purchases → QuickAdd) |
| `/conversions` | `pages/ConversionsPage.tsx` | `GET/POST /DrugConversions, DELETE /:id` + `GET /Drugs,/Units` for labels |
| `/suppliers` | `pages/SuppliersPage.tsx` | CRUD `/Suppliers` |
| `/purchases` | `pages/PurchasesPage.tsx` | `GET /Purchases` + per-row `GET /Purchases/:id` (lines), `POST /Purchases`, `GET /Drugs,/Units,/Suppliers,/Users`, `POST /Drugs` (QuickAdd) |
| `/sales` | `pages/SalesPage.tsx` (POS, 441 LOC) | `GET /Sales` + per-row `GET /Sales/:id`, `POST /Sales`, `GET /Drugs,/Units,/DrugConversions` |
| `/reports/sales` | `pages/reports/SalesReportPage.tsx` | `GET /Sales` + all `GET /Sales/:id`, `GET /Drugs,/Units` |
| `/reports/purchases` | `pages/reports/PurchasesReportPage.tsx` | `GET /Purchases` + all `/:id`, `GET /Drugs,/Units,/Suppliers` |
| `/reports/closing` | `pages/reports/ClosingReportPage.tsx` | `GET /Drugs,/Purchases,/Sales` + bulk `/:id`, `GET /Units,/DrugConversions` |

Helpers: `src/api/resources.ts` generic `crud<T>(path)` (`list/get/create/update/remove`) + `conversionsApi.byDrug`; `src/hooks/queries.ts` `useUsers/useUnits/useDrugs/useSuppliers/usePurchases/useSales/useConversions/useConversionsByDrug` + `useInvalidate`; `src/store/auth.ts` (zustand persist `pharmacy-auth`), `saleCart.ts` (POS cart, non-persisted), `ui.ts` (sidebar); `src/lib/alert.ts` (Swal toast/confirm/apiError), `src/lib/report.ts` (`exportToExcel` via xlsx, `printReport` A4, `day/monthStart`).

---

## 5. End-to-End Flows

### 5.1 Auth (demo, no JWT)
`Login.tsx` → `GET /Users` → `find(username)` → empty no-op password check (`demo: any`) → `useAuth.login(u)` persisted to `localStorage: pharmacy-auth` → `Guard` redirects unauthenticated → topbar shows `fullName+role`, Logout clears store. No token is ever sent. `UserRepo.GetByUsernameAsync` exists but is unused.

### 5.2 Purchase — Stock IN (FEFO lots created)
`PurchasesPage → +New Purchase (2xl modal)`: pick supplier (nullable) → auto invoice `INV-YYYYMMDD-###` (scans existing, `↻` regen) → per line pick drug (prefills `sellingPrice/baseUnit`) + unit + qty + price + expiry (required) → `+` opens `QuickAddDrug` (`POST /Drugs`, stock 0) → must `+Add line` before save → `POST /Purchases {supplierId,userId,purchaseDate,totalAmount:0,invoiceNumber,items:[{drugId,unitId,quantity,unitPrice,expiryDate}]}` → backend converts each line to base units, `UPDATE Drugs.StockQuantity`, `INSERT DrugBatches` → invalidate `purchases,drugs`. History table hydrates each row via `GET /Purchases/:id` + resolves supplier/creator names. Delete reverses stock + deletes batches.

### 5.3 Sale — POS Stock OUT (FEFO deducted)
`SalesPage (zustand saleCart)`: set customer (default `General Customer`) + payment (`Cash/Card/Mobile`) → row: drug → auto `unitPrice=sellingPrice, unitId=baseUnitId`; changing unit auto-converts `round(sellingPrice*factor)` where `factor` = exact `DrugConversions(drug,from→base)` else `1/reverse` else block with `go to Conversions` error → validations: `qty>0, price≥0, conversion must exist for non-base, floor(qty*factor) ≤ stockQuantity` → Add to cart → checkout re-validates → `POST /Sales {userId,customerName,saleDate,totalAmount:0,discount,netAmount:0,paymentMethod,items}` (backend computes totals) → snapshot `pendingReceipt` → 80mm thermal receipt modal + `window.print()` popup → invalidate `sales,drugs`. History enriched per-sale via `GET /Sales/:id` + `View` Swal detail. Delete does **not** restore stock.

### 5.4 Unit Conversions
`ConversionsPage`: create-only + delete (no edit). Modal: `Drug + From unit + To unit + Factor` (e.g. `1 Strip = 10 Tablet`). Used by POS price conversion and backend stock math; closing report falls back to `1` if missing (POS blocks instead).

### 5.5 Dashboard / Inventory / Reports
- **Dashboard:** `Hello {fullName}` + date hero, quick links (`+New sale/purchase/Closing`), 6 cards (drugs count, low-stock `<10`, sales count, revenue `sum(netAmount) MMK`, purchases, suppliers), low-stock top-10 (`red if 0 else amber`).
- **Inventory CRUD:** Users/Units/Suppliers = modal add/edit + `confirmDelete` + table. Drugs = table + `Price/Expiry` modal + delete only.
- **Reports** (all default `monthStart()→today`, client-side filter over fully hydrated list+per-id data, `Print` A4 popup + `Excel` via xlsx): Sales (filter date/payment/customer, footer totals), Purchases (filter date/supplier/invoice), Closing (`opening=closing-purchased+sold` in base units, `value=closing*sellingPrice`, search drug/generic).

---

## 6. Run Locally

```bash
# 1. Database (SQL Server .\SQLEXPRESS)
sqlcmd -S .\SQLEXPRESS -i PharmacyManagemntWebApi/Database/PharmacyMS_DB_Tables.sql
sqlcmd -S .\SQLEXPRESS -i PharmacyManagemntWebApi/DatabaseMigrations.sql
# check appsettings.json DefaultConnection

# 2. Backend (swagger at http://localhost:5084/swagger)
cd PharmacyManagemntWebApi
dotnet restore && dotnet run   # profiles: http 5084, https 7149 (launchSettings.json)

# 3. Frontend
cd pharmacy-frontend
cp .env.example .env   # set VITE_API_URL=http://localhost:5084/api
npm install && npm run dev   # http://localhost:5173
# login: admin / admin123 (demo — any password currently accepted, see 5.1)
```

---

## 7. Known Limitations / Gaps

- No JWT/auth — `UseAuthorization` without authentication, no `[Authorize]`, frontend stores user in localStorage, password check is a no-op.
- `DELETE /Sales` does not restore stock/batches (unlike `DELETE /Purchases` which does).
- `DrugsPage` has no create form; `PharmacyManagemntWebApi.http` is a stale weatherforecast template; `DrugModels.cs` unused; `UnitModles`/`GellAllUnits` typos; `DrugBatches.PurchaseItemId` nullability differs between scripts; Expiry `DATE` vs `DATETIME`.
- Reports hydrate N+1 (`GET /:id` per sale/purchase) — fine for small data, slow at scale.
