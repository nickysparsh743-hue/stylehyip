'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import CustomerManagement from '@/components/admin/CustomerManagement';

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

  return <CustomerManagement />;
}
