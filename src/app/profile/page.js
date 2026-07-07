'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/lib/context/AuthContext';

const recentOrdersPlaceholder = [];

function ProfileEditor({ user, profile, supabase, refreshProfile }) {
    const { push } = useToast();
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: profile?.full_name || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSave = async (event) => {
        event.preventDefault();

        const fullName = formData.fullName.trim();
        const phone = formData.phone.trim();
        const address = formData.address.trim();

        if (!fullName) {
            push('Please add your full name.', 'error');
            return;
        }

        if (phone.length < 7) {
            push('Please enter a valid phone number.', 'error');
            return;
        }

        if (!address) {
            push('Please enter your delivery address.', 'error');
            return;
        }

        if (!user?.id) {
            push('You need to be signed in to update your profile.', 'error');
            return;
        }

        setIsSaving(true);
        const { error } = await supabase.from('profiles').update({
            full_name: fullName,
            phone,
            address,
        }).eq('id', user.id);

        if (error) {
            push(error.message || 'Unable to save your profile.', 'error');
            setIsSaving(false);
            return;
        }

        await refreshProfile(user.id);
        setIsSaving(false);
        push('Profile updated successfully.', 'success');
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm('Delete your account? This will remove your profile and sign you out.');
        if (!confirmed) {
            return;
        }

        if (!user?.id) {
            push('You need to be signed in to delete your account.', 'error');
            return;
        }

        setIsDeleting(true);
        const response = await fetch('/api/profile', { method: 'DELETE' });
        const body = await response.json();

        if (!response.ok) {
            push(body.error || 'Unable to delete your account.', 'error');
            setIsDeleting(false);
            return;
        }

        await supabase.auth.signOut();
        router.push('/');
        push('Your account has been deleted.', 'success');
    };

    return (
        <>
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Account</p>
                <h1 className="mt-2 text-3xl font-semibold text-stone-900">Profile</h1>
                <p className="mt-3 text-stone-600">Update your delivery details and keep your account preferences handy.</p>
                <form onSubmit={handleSave} className="mt-8 space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Full name</label>
                        <input
                            value={formData.fullName}
                            onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                            className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Phone</label>
                        <input
                            value={formData.phone}
                            onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                            className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Address</label>
                        <textarea
                            value={formData.address}
                            onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                            className="min-h-[100px] w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
                        />
                    </div>
                    <button type="submit" disabled={isSaving} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60">
                        {isSaving ? 'Saving…' : 'Save profile'}
                    </button>
                </form>
            </div>
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Danger zone</p>
                        <h2 className="mt-2 text-xl font-semibold text-stone-900">Delete account</h2>
                    </div>
                    <button
                        type="button"
                        disabled={isDeleting}
                        onClick={handleDeleteAccount}
                        className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
                    >
                        {isDeleting ? 'Deleting…' : 'Delete account'}
                    </button>
                </div>
                <p className="mt-4 text-sm text-stone-600">Deleting your account removes your profile information from the store and signs you out immediately.</p>
            </div>
        </>
    );
}

export default function ProfilePage() {
    const { user, profile, loading, supabase, refreshProfile } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const accountRole = profile?.role || user?.user_metadata?.role || 'customer';
    const displayName = useMemo(() => {
        return profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Your profile';
    }, [profile, user]);

    const joinedAt = useMemo(() => {
        if (!profile?.created_at) {
            return '—';
        }

        return new Date(profile.created_at).toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }, [profile]);

    useEffect(() => {
        async function loadOrders() {
            if (!user?.id) {
                setOrders([]);
                setLoadingOrders(false);
                return;
            }

            setLoadingOrders(true);
            try {
                const response = await fetch('/api/orders');
                const body = await response.json();
                if (!response.ok) {
                    throw new Error(body.error || 'Unable to load your orders.');
                }
                setOrders(body.orders || []);
            } catch (error) {
                console.error(error);
                setOrders([]);
            } finally {
                setLoadingOrders(false);
            }
        }

        loadOrders();
    }, [user?.id]);

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Account</p>
                    <div className="mt-4 h-8 w-40 animate-pulse rounded-full bg-stone-200" />
                    <div className="mt-4 h-4 w-3/4 animate-pulse rounded-full bg-stone-200" />
                </div>
            </div>
        );
    }

    const profileKey = profile ? `${profile.id}-${profile.updated_at || profile.created_at || 'loaded'}` : 'profile-empty';

    return (
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.7fr] lg:px-8">
            <div className="space-y-6">
                <ProfileEditor key={profileKey} user={user} profile={profile} supabase={supabase} refreshProfile={refreshProfile} />
            </div>

            <div className="space-y-6">
                <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Account details</p>
                    <h2 className="mt-2 text-xl font-semibold text-stone-900">{displayName}</h2>
                    <dl className="mt-6 space-y-4 text-sm text-stone-600">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                            <dt className="font-medium text-stone-800">Email</dt>
                            <dd>{user?.email || '—'}</dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                            <dt className="font-medium text-stone-800">Role</dt>
                            <dd className="capitalize">{accountRole}</dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                            <dt className="font-medium text-stone-800">Account status</dt>
                            <dd>{profile?.is_active ? 'Active' : 'Inactive'}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="font-medium text-stone-800">Date joined</dt>
                            <dd>{joinedAt}</dd>
                        </div>
                    </dl>
                </div>
                <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-stone-900">Recent orders</h2>
                            <p className="mt-2 text-sm text-stone-600">Orders saved in your account from the database.</p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3">
                        {loadingOrders ? (
                            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">Loading orders…</div>
                        ) : orders.length === 0 ? (
                            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">No orders found yet.</div>
                        ) : (
                            orders.map((order) => (
                                <div key={order.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-semibold text-stone-900">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                                            <p className="text-sm text-stone-500">{new Date(order.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                        </div>
                                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">{order.status}</span>
                                    </div>
                                    <div className="mt-4 grid gap-3 border-t border-stone-200 pt-4 text-sm text-stone-600">
                                        <p><span className="font-semibold text-stone-800">Delivery:</span> {order.delivery_address}</p>
                                        <p><span className="font-semibold text-stone-800">Phone:</span> {order.phone}</p>
                                        <p><span className="font-semibold text-stone-800">Total:</span> KES {order.total?.toLocaleString('en-KE')}</p>
                                        {order.order_items?.length ? (
                                            <div className="space-y-2">
                                                <p className="font-semibold text-stone-800">Items</p>
                                                {order.order_items.map((item) => (
                                                    <p key={item.id} className="text-stone-600">
                                                        {item.quantity} × {item.product?.name || 'Item'} @ KES {item.unit_price?.toLocaleString('en-KE')}
                                                    </p>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <Link href="/orders" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                        View orders
                    </Link>
                </div>
            </div>
        </div>
    );
}
