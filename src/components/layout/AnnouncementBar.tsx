import Link from 'next/link';
import { getSiteContent } from '@/server/services/content.service';

/** Optional one-line promotion above the header. Admins switch it on under "Website content". */
export async function AnnouncementBar() {
  const content = await getSiteContent();
  if (!content.announcementEnabled || !content.announcementText) return null;
  const text = <span className="font-medium">{content.announcementText}</span>;
  return (
    <div className="bg-volt-400 px-4 py-2 text-center text-sm text-slate-900">
      {content.announcementHref ? (
        <Link href={content.announcementHref} className="underline-offset-4 hover:underline">
          {text}
        </Link>
      ) : (
        text
      )}
    </div>
  );
}
