'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { apiUpload } from '@/lib/api-client';
import { DEVICE_TYPES, MAX_REPAIR_PHOTOS, SERVICE_MODE_LABEL, type ServiceMode } from '@/lib/repair-constants';
import { BookingPicker, type BookingChoice } from './BookingPicker';
import { PhotoPicker } from './PhotoPicker';

export interface ServiceOption { slug: string; label: string }

interface Props {
  services: ServiceOption[];
  initialService?: string;
  /** Start with the "book a repairer" section open (the /repairs/book page). */
  withBooking?: boolean;
}

type FieldErrors = Record<string, string[] | undefined>;

interface CreateResult { reference: string; accessCode: string; booking: { reference: string } | null; bookingError: string | null }

export function RepairRequestForm({ services, initialService, withBooking = false }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [serviceSlug, setServiceSlug] = useState(initialService ?? services[0]?.slug ?? 'other');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deviceType, setDeviceType] = useState<string>(DEVICE_TYPES[0]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [faultSummary, setFaultSummary] = useState('');
  const [faultDetails, setFaultDetails] = useState('');
  const [serviceMode, setServiceMode] = useState<ServiceMode>('WORKSHOP');
  const [address, setAddress] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [wantBooking, setWantBooking] = useState(withBooking);
  const [choice, setChoice] = useState<BookingChoice>({ repairerId: '', date: '', time: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!user) return;
    setName((v) => v || `${user.firstName} ${user.lastName}`.trim());
    setEmail((v) => v || user.email);
    setPhone((v) => v || user.phone || '');
  }, [user]);

  function err(field: string) {
    const msg = fieldErrors[field]?.[0];
    return msg ? <p className="field-error" role="alert">{msg}</p> : null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    if (wantBooking && (!choice.repairerId || !choice.date || !choice.time)) {
      setError('Choose a repairer, a date and a time, or untick "Book a repairer now".');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      const values: Record<string, string> = { name, email, phone, serviceSlug, deviceType, brand, model, serialNumber, faultSummary, faultDetails, serviceMode, address };
      Object.entries(values).forEach(([k, v]) => form.set(k, v));
      if (wantBooking) {
        form.set('repairerId', choice.repairerId);
        form.set('date', choice.date);
        form.set('time', choice.time);
      }
      files.forEach((f) => form.append('photos', f));
      const result = await apiUpload<CreateResult>('/api/repairs', form);
      const notice = result.bookingError ? `?notice=${encodeURIComponent(`Your request was saved, but the appointment could not be booked: ${result.bookingError}`)}` : '?new=1';
      router.push(`/repairs/t/${result.accessCode}${notice}`);
    } catch (e) {
      const details = (e as { details?: FieldErrors }).details;
      if (details && typeof details === 'object') setFieldErrors(details);
      setError(e instanceof Error ? e.message : 'Could not send your request.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <section aria-labelledby="rr-device" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="rr-device" className="text-lg font-semibold text-slate-900">1. The device</h2>
        <div>
          <label htmlFor="rr-service" className="field-label">What do you need?</label>
          <select id="rr-service" value={serviceSlug} onChange={(e) => setServiceSlug(e.target.value)} className="field-input">
            {services.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rr-type" className="field-label">Device type</label>
            <select id="rr-type" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className="field-input">{DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <div>
            <label htmlFor="rr-brand" className="field-label">Brand</label>
            <input id="rr-brand" value={brand} onChange={(e) => setBrand(e.target.value)} aria-invalid={!!fieldErrors.brand} className="field-input" placeholder="e.g. HP, Samsung, Apple" />
            {err('brand')}
          </div>
          <div>
            <label htmlFor="rr-model" className="field-label">Model</label>
            <input id="rr-model" value={model} onChange={(e) => setModel(e.target.value)} aria-invalid={!!fieldErrors.model} className="field-input" />
            {err('model')}
          </div>
          <div>
            <label htmlFor="rr-serial" className="field-label">Serial number / IMEI <span className="font-normal text-slate-500">(optional)</span></label>
            <input id="rr-serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="field-input" />
          </div>
        </div>
      </section>

      <section aria-labelledby="rr-fault" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="rr-fault" className="text-lg font-semibold text-slate-900">2. What is wrong?</h2>
        <div>
          <label htmlFor="rr-summary" className="field-label">Short title of the fault</label>
          <input id="rr-summary" value={faultSummary} onChange={(e) => setFaultSummary(e.target.value)} aria-invalid={!!fieldErrors.faultSummary} className="field-input" placeholder="e.g. Cracked screen, will not charge" maxLength={120} />
          {err('faultSummary')}
        </div>
        <div>
          <label htmlFor="rr-details" className="field-label">Describe the fault</label>
          <textarea id="rr-details" rows={5} value={faultDetails} onChange={(e) => setFaultDetails(e.target.value)} aria-invalid={!!fieldErrors.faultDetails} className="field-input h-auto py-3" placeholder="When did it start? What happens? Has it been dropped, wet or opened before?" maxLength={3000} />
          {err('faultDetails')}
        </div>
        <PhotoPicker id="rr-photos" files={files} onChange={setFiles} max={MAX_REPAIR_PHOTOS} label="Photos of the damage" />
        <p className="text-sm text-slate-500">Clear photos of the damage, the screen, the ports and the model label help us give an accurate quotation. Only our team and you can see them.</p>
      </section>

      <section aria-labelledby="rr-contact" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="rr-contact" className="text-lg font-semibold text-slate-900">3. How can we reach you?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rr-name" className="field-label">Full name</label>
            <input id="rr-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!fieldErrors.name} className="field-input" />
            {err('name')}
          </div>
          <div>
            <label htmlFor="rr-phone" className="field-label">Phone / WhatsApp</label>
            <input id="rr-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!fieldErrors.phone} className="field-input" />
            {err('phone')}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="rr-email" className="field-label">Email</label>
            <input id="rr-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldErrors.email} className="field-input" />
            {err('email')}
          </div>
        </div>
        <fieldset>
          <legend className="field-label">Where should the repair happen?</legend>
          <div className="space-y-2">
            {(Object.keys(SERVICE_MODE_LABEL) as ServiceMode[]).map((m) => (
              <label key={m} className="flex items-center gap-3 text-sm text-slate-800">
                <input type="radio" name="rr-mode" checked={serviceMode === m} onChange={() => { setServiceMode(m); setChoice((c) => ({ ...c, repairerId: '', time: '' })); }} className="h-4 w-4 accent-brand-600" /> {SERVICE_MODE_LABEL[m]}
              </label>
            ))}
          </div>
        </fieldset>
        {serviceMode === 'ONSITE' ? (
          <div>
            <label htmlFor="rr-address" className="field-label">Address for the visit</label>
            <input id="rr-address" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} className="field-input" />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="rr-book" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="rr-book" className="text-lg font-semibold text-slate-900">4. Book a repairer <span className="text-sm font-normal text-slate-500">(optional)</span></h2>
        <label className="flex items-center gap-3 text-sm text-slate-800">
          <input type="checkbox" checked={wantBooking} onChange={(e) => setWantBooking(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Book a repairer now
        </label>
        <p className="text-sm text-slate-500">You can also skip this: send the request first, agree the price with us, then book from your tracking page.</p>
        {wantBooking ? <BookingPicker idPrefix="rr" mode={serviceMode} value={choice} onChange={setChoice} /> : null}
      </section>

      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? <Spinner /> : null} Send repair request</button>
    </form>
  );
}
