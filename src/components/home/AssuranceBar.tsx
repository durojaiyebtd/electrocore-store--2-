import { LockIcon, PhoneCallIcon, ShieldIcon, TruckIcon } from '@/components/ui/Icons';
import { formatMoney } from '@/lib/currency';
import { freeShippingThreshold } from '@/lib/shipping';

export function AssuranceBar() {
  const items = [
    { icon: TruckIcon, title: 'Nationwide delivery', body: `Free on orders over ${formatMoney(freeShippingThreshold())}` },
    { icon: ShieldIcon, title: 'Real warranties', body: 'Honoured in our own workshop' },
    { icon: LockIcon, title: 'Secure payment', body: 'Card, transfer or USSD via Paystack' },
    { icon: PhoneCallIcon, title: 'Engineer support', body: 'Setup help from people who build devices' },
  ];
  return (
    <section aria-label="Why shop with us" className="border-b border-slate-200 bg-white">
      <ul className="container-page grid grid-cols-2 gap-x-6 gap-y-6 py-8 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex gap-3">
              <Icon size={24} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
