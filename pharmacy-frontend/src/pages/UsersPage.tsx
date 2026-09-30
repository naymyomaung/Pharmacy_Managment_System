import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/resources';
import type { User } from '../api/types';
import { useUsers } from '../hooks/queries';
import { Card, Spinner, Empty } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field } from '../components/Field';
import { toast, confirmDelete, apiError } from '../lib/alert';

const empty = { fullName: '', username: '', passwordHash: '', role: 'Cashier' };

export default function UsersPage() {
  const { data, isLoading } = useUsers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ['users'] });

  const openAdd = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (u: User) => {
    setEditId(u.userId);
    setForm({ fullName: u.fullName, username: u.username, passwordHash: '', role: u.role });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => editId ? usersApi.update(editId, { ...form, userId: editId }) : usersApi.create(form),
    onSuccess: () => { toast('Saved'); setOpen(false); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });
  const del = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => { toast('Deleted'); inv(); },
    onError: (e) => toast(String(apiError(e)), 'error'),
  });

  const cols: ColumnDef<User>[] = [
    { header: 'ID', accessorKey: 'userId' },
    { header: 'Full name', accessorKey: 'fullName' },
    { header: 'Username', accessorKey: 'username' },
    { header: 'Role', accessorKey: 'role' },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(row.original)}>Edit</button>
        <button className="btn-danger px-2 py-1 text-xs" onClick={async () => { if (await confirmDelete(row.original.username)) del.mutate(row.original.userId); }}>Del</button>
      </div>) },
  ];

  return (
    <>
      <Card title="Users" action={<button className="btn-primary" onClick={openAdd}>+ Add User</button>}>
        {isLoading ? <Spinner /> : !data?.length ? <Empty /> : <DataTable columns={cols} data={data} />}
      </Card>
      {open && (
        <Modal title={editId ? 'Edit user' : 'Add user'} onClose={() => setOpen(false)}>
          <div className="grid gap-3">
            <Field label="Full name *"><input className="input" placeholder="e.g. John Doe" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Username *"><input className="input" placeholder="e.g. john" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
            <Field label={editId ? 'New password hash (leave blank to keep)' : 'Password hash *'}><input className="input" placeholder="Password hash" value={form.passwordHash} onChange={(e) => setForm({ ...form, passwordHash: e.target.value })} /></Field>
            <Field label="Role *"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Admin</option><option>Pharmacist</option><option>Cashier</option>
            </select></Field>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => save.mutate()}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
