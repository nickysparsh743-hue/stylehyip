'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { uploadSiteSettingsImage, deleteStorageFile, getStorageFilePathFromUrl } from '@/lib/supabase/storage';

/* eslint-disable @next/next/no-img-element */

const sections = [
    ['general', 'General'], ['contact', 'Contact'], ['social', 'Social'],
    ['homepage', 'SEO'], ['legal', 'Legal'],
];

const labels = {
    storeName: 'Store name', tagline: 'Store tagline', description: 'Store description',
    storeLogo: 'Store logo', favicon: 'Website favicon', websiteUrl: 'Website URL', currency: 'Default currency', timeZone: 'Time zone',
    businessEmail: 'Business email', supportEmail: 'Customer support email', businessPhone: 'Business phone number', whatsappNumber: 'WhatsApp number',
    address: 'Physical business address', city: 'City', county: 'County', supportHours: 'Support working hours',
    facebook: 'Facebook URL', instagram: 'Instagram URL', tiktok: 'TikTok URL', twitter: 'X (Twitter) URL', youtube: 'YouTube URL', linkedin: 'LinkedIn URL',
    heroHeading: 'Hero heading', heroDescription: 'Hero description', heroBackgroundImage: 'Hero background image', heroButtonText: 'Hero button text',
    heroButtonLink: 'Hero button link', announcementText: 'Promotional announcement', promotionalBannerImage: 'Promotional banner image',
    featuredProductsVisible: 'Show featured products', featuredCategoriesVisible: 'Show featured categories', newArrivalsVisible: 'Show new arrivals',
    title: 'Default SEO title', description: 'Default meta description', keywords: 'SEO keywords', ogTitle: 'Open Graph title',
    ogDescription: 'Open Graph description', ogImage: 'Open Graph image', author: 'Website author', analyticsId: 'Google Analytics measurement ID',
    searchConsoleVerification: 'Google Search Console verification code',
    privacyPolicy: 'Privacy Policy', termsAndConditions: 'Terms and Conditions', returnPolicy: 'Return and Refund Policy', shippingPolicy: 'Shipping Policy', cancellationPolicy: 'Cancellation Policy',
};

function Field({ name, value, onChange, type = 'text', textarea = false, help, placeholder }) {
    const common = { value: value ?? '', onChange: (event) => onChange(name, event.target.value), placeholder, className: 'mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100' };
    return <div><label className="block text-sm font-semibold text-stone-800">{labels[name] || name}</label>{textarea ? <textarea {...common} rows={9} /> : <input {...common} type={type} />} {help ? <p className="mt-1.5 text-xs leading-5 text-stone-500">{help}</p> : null}</div>;
}

function ImageField({ name, value, busy, onUpload, onRemove }) {
    return <div><label className="block text-sm font-semibold text-stone-800">{labels[name]}</label>{value ? <div className="mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"><img src={value} alt={labels[name]} className="h-44 w-full object-cover" /></div> : <div className="mt-2 flex h-32 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">No image uploaded</div>}<div className="mt-3 flex flex-wrap gap-2"><label className="cursor-pointer rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">{busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(event) => event.target.files?.[0] && onUpload(name, event.target.files[0])} /></label>{value ? <button type="button" disabled={busy} onClick={() => onRemove(name)} className="rounded-full px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Remove</button> : null}</div></div>;
}

export default function AdminSettingsPage() {
    const { push } = useToast();
    const [active, setActive] = useState('general');
    const [settings, setSettings] = useState(null);
    const [initial, setInitial] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState('');

    useEffect(() => { (async () => { try { const response = await fetch('/api/site-settings', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load settings.'); setSettings(data.settings); setInitial(structuredClone(data.settings)); } catch (error) { push(error.message, 'error'); } finally { setLoading(false); } })(); }, [push]);

    const dirty = useMemo(() => !settings || !initial ? false : JSON.stringify(settings[active]) !== JSON.stringify(initial[active]), [settings, initial, active]);
    function updateField(name, value) { setSettings((current) => ({ ...current, [active]: { ...current[active], [name]: value } })); }

    async function saveSection() {
        setSaving(true); try {
            if (active === 'contact') for (const key of ['businessEmail', 'supportEmail']) { const value = settings.contact[key]?.trim() || ''; if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`${labels[key]} is invalid.`); }
            if (active === 'general' && settings.general.websiteUrl) { try { new URL(settings.general.websiteUrl); } catch { throw new Error('Website URL is invalid.'); } }
            if (active === 'social') for (const [key, value] of Object.entries(settings.social)) if (value && !/^https?:\/\//i.test(value)) throw new Error(`${labels[key]} must begin with http:// or https://.`);
            const response = await fetch('/api/site-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section: active, values: settings[active] }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to save settings.'); setSettings(data.settings); setInitial(structuredClone(data.settings)); push(`${sections.find(([key]) => key === active)[1]} settings saved.`, 'success');
        } catch (error) { push(error.message, 'error'); } finally { setSaving(false); }
    }

    async function uploadImage(name, file) { setUploading(name); try { const uploaded = await uploadSiteSettingsImage(file, name); setSettings((current) => ({ ...current, [active]: { ...current[active], [name]: uploaded.publicUrl } })); push('Image uploaded.', 'success'); } catch (error) { push(error.message, 'error'); } finally { setUploading(''); } }
    async function removeImage(name) { const url = settings[active][name]; const path = getStorageFilePathFromUrl(url); setUploading(name); try { if (path) await deleteStorageFile(path); setSettings((current) => ({ ...current, [active]: { ...current[active], [name]: '' } })); push('Image removed.', 'success'); } catch (error) { push(error.message, 'error'); } finally { setUploading(''); } }

    if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-stone-600">Loading site settings…</div>;
    if (!settings) return <div className="mx-auto max-w-7xl px-4 py-16 text-red-700">Site settings could not be loaded.</div>;
    const value = settings[active];

    return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">Site Settings</h1><p className="mt-2 text-sm text-stone-600">Manage store identity, public content, SEO, and legal information.</p></div><div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><nav className="flex gap-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 lg:block lg:space-y-1 lg:overflow-visible" aria-label="Settings sections">{sections.map(([key, label]) => <button key={key} type="button" onClick={() => setActive(key)} className={`shrink-0 rounded-xl px-4 py-3 text-left text-sm font-semibold transition lg:block lg:w-full ${active === key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}>{label}</button>)}</nav><div className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-8"><div className="mb-6 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-stone-900">{sections.find(([key]) => key === active)[1]} settings</h2>{dirty ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Unsaved changes</span> : null}</div>
        {active === 'general' && <div className="grid gap-5 md:grid-cols-2"><Field name="storeName" value={value.storeName} onChange={updateField} /><Field name="tagline" value={value.tagline} onChange={updateField} /><div className="md:col-span-2"><Field name="description" value={value.description} onChange={updateField} textarea /></div><ImageField name="storeLogo" value={value.storeLogo} busy={uploading === 'storeLogo'} onUpload={uploadImage} onRemove={removeImage} /><ImageField name="favicon" value={value.favicon} busy={uploading === 'favicon'} onUpload={uploadImage} onRemove={removeImage} /><Field name="websiteUrl" value={value.websiteUrl} onChange={updateField} type="url" /><Field name="currency" value={value.currency} onChange={updateField} /><Field name="timeZone" value={value.timeZone} onChange={updateField} help="IANA timezone, for example Africa/Nairobi." /></div>}
        {active === 'contact' && <div className="grid gap-5 md:grid-cols-2"><Field name="businessEmail" value={value.businessEmail} onChange={updateField} type="email" /><Field name="supportEmail" value={value.supportEmail} onChange={updateField} type="email" /><Field name="businessPhone" value={value.businessPhone} onChange={updateField} type="tel" /><Field name="whatsappNumber" value={value.whatsappNumber} onChange={updateField} type="tel" /><div className="md:col-span-2"><Field name="address" value={value.address} onChange={updateField} /></div><Field name="city" value={value.city} onChange={updateField} /><Field name="county" value={value.county} onChange={updateField} /><div className="md:col-span-2"><Field name="supportHours" value={value.supportHours} onChange={updateField} /></div></div>}
        {active === 'social' && <div className="grid gap-5 md:grid-cols-2">{['facebook', 'instagram', 'tiktok', 'twitter', 'youtube', 'linkedin'].map((name) => <Field key={name} name={name} value={value[name]} onChange={updateField} type="url" placeholder="https://" />)}</div>}
        {active === 'homepage' && <div className="grid gap-5 md:grid-cols-2"><div className="md:col-span-2"><Field name="heroHeading" value={value.heroHeading} onChange={updateField} /></div><div className="md:col-span-2"><Field name="heroDescription" value={value.heroDescription} onChange={updateField} textarea /></div><ImageField name="heroBackgroundImage" value={value.heroBackgroundImage} busy={uploading === 'heroBackgroundImage'} onUpload={uploadImage} onRemove={removeImage} /><ImageField name="promotionalBannerImage" value={value.promotionalBannerImage} busy={uploading === 'promotionalBannerImage'} onUpload={uploadImage} onRemove={removeImage} /><Field name="heroButtonText" value={value.heroButtonText} onChange={updateField} /><Field name="heroButtonLink" value={value.heroButtonLink} onChange={updateField} /><div className="md:col-span-2"><Field name="announcementText" value={value.announcementText} onChange={updateField} /></div>{['featuredProductsVisible', 'featuredCategoriesVisible', 'newArrivalsVisible'].map((name) => <label key={name} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-800"><span>{labels[name]}</span><input type="checkbox" checked={Boolean(value[name])} onChange={(event) => updateField(name, event.target.checked)} className="h-5 w-5 accent-stone-900" /></label>)}</div>}
        {active === 'seo' && <div className="grid gap-5 md:grid-cols-2"><div className="md:col-span-2"><Field name="title" value={value.title} onChange={updateField} /></div><div className="md:col-span-2"><Field name="description" value={value.description} onChange={updateField} textarea /></div><Field name="keywords" value={value.keywords} onChange={updateField} /><Field name="author" value={value.author} onChange={updateField} /><div className="md:col-span-2"><Field name="ogTitle" value={value.ogTitle} onChange={updateField} /></div><div className="md:col-span-2"><Field name="ogDescription" value={value.ogDescription} onChange={updateField} textarea /></div><div className="md:col-span-2"><ImageField name="ogImage" value={value.ogImage} busy={uploading === 'ogImage'} onUpload={uploadImage} onRemove={removeImage} /></div><Field name="analyticsId" value={value.analyticsId} onChange={updateField} placeholder="G-XXXXXXXXXX" /><Field name="searchConsoleVerification" value={value.searchConsoleVerification} onChange={updateField} /></div>}
        {active === 'legal' && <div className="space-y-5">{['privacyPolicy', 'termsAndConditions', 'returnPolicy', 'shippingPolicy', 'cancellationPolicy'].map((name) => <Field key={name} name={name} value={value[name]} onChange={updateField} textarea help="Plain text or HTML formatting is preserved." />)}</div>}
        <div className="mt-8 flex justify-end border-t border-stone-200 pt-6"><button type="button" onClick={saveSection} disabled={saving} className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button></div></div></div></div>;
}
