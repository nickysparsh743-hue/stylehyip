'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function AdminUsersPage() {
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const payload = await response.json();
        setUsers(payload.users || []);
      }
    }

    loadUsers();
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, phone }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to invite customer.');
      }

      push('Customer invitation sent successfully.', 'success');
      setEmail('');
      setFullName('');
      setPhone('');
      setUsers((current) => [payload.user, ...current]);
    } catch (error) {
      push(error.message || 'Unable to invite customer.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">Customer accounts</h1>
        <p className="mt-3 text-sm text-stone-600">Administrators can invite customers and manage access.</p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-800">Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-800">Full name</label>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-800">Phone</label>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3" />
          </div>
          <div className="flex items-end">
            <button disabled={isSubmitting} className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {isSubmitting ? 'Inviting…' : 'Invite customer'}
            </button>
          </div>
        </form>

        <div className="mt-8 grid gap-4">
          {users.map((user) => (
            <div key={user.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">{user.full_name || user.email}</h2>
                  <p className="text-sm text-stone-600">{user.email}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm text-stone-700">{user.role || 'customer'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
