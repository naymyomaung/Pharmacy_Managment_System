import Swal from 'sweetalert2';

export const toast = (title: string, icon: 'success' | 'error' | 'info' = 'success') =>
  Swal.fire({ title, icon, timer: 1800, showConfirmButton: false, toast: true, position: 'top-end' });

export const confirmDelete = async (name = 'this record') => {
  const r = await Swal.fire({
    title: `Delete ${name}?`,
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    confirmButtonText: 'Yes, delete',
  });
  return r.isConfirmed;
};

export const apiError = (e: unknown) =>
  (e as { response?: { data?: unknown } })?.response?.data ??
  (e as Error)?.message ??
  'Something went wrong';
