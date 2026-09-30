import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';

export function DataTable<T>({ columns, data }: { columns: ColumnDef<T>[]; data: T[] }) {
  const table = useReactTable({ columns, data, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-clinic-line bg-white">
        <table className="table min-w-[640px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr><td colSpan={columns.length} className="py-6 text-center text-slate-500">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-sm">
        <button className="btn-ghost px-3 py-1" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</button>
        <span>Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}</span>
        <button className="btn-ghost px-3 py-1" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
      </div>
    </div>
  );
}
