'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

const initialSettings = {
    storeName: 'Step Into Style',
    deliveryWindow: '1-3 business days',
    mpesaPaybill: '123456',
    mpesaAccount: 'STEPSTYLE',
    supportEmail: 'hello@stepintostyle.co.ke',
};

export default function AdminSettingsPage() {
    const { push } = useToast();
    const [settings, setSettings] = useState(initialSettings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const stored = window.localStorage.getItem('stylehyip-settings');
        if (stored) {
            try {
                setSettings(JSON.parse(stored));
            } catch {
                setSettings(initialSettings);
            }
        }
    }, []);

    const handleSave = (event) => {
        event.preventDefault();
        setIsSaving(true);
        window.setTimeout(() => {
            window.localStorage.setItem('stylehyip-settings', JSON.stringify(settings));
            setIsSaving(false);
            push('Store settings saved.', 'success');
        }, 400);
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p>
                <h1 className="mt-2 text-3xl font-semibold text-stone-900">Settings</h1>
                <p className="mt-3 text-stone-600">Update delivery windows, M-Pesa details, and store copy here.</p>

                <form onSubmit={handleSave} className="mt-8 grid gap-6 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Store name</label>
                        <input value={settings.storeName} onChange={(event) => setSettings({ ...settings, storeName: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Delivery window</label>
                        <input value={settings.deliveryWindow} onChange={(event) => setSettings({ ...settings, deliveryWindow: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">M-Pesa paybill</label>
                        <input value={settings.mpesaPaybill} onChange={(event) => setSettings({ ...settings, mpesaPaybill: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">M-Pesa account</label>
                        <input value={settings.mpesaAccount} onChange={(event) => setSettings({ ...settings, mpesaAccount: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Support email</label>
                        <input value={settings.supportEmail} onChange={(event) => setSettings({ ...settings, supportEmail: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <button type="submit" disabled={isSaving} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60">
                            {isSaving ? 'Saving…' : 'Save settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
