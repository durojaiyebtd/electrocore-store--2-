/**
 * Emails about repair activity. Sending is best-effort and never blocks or fails the request;
 * if SMTP is not configured the activity is still saved and shown in the admin portal.
 */
import { sendMail, isMailConfigured } from './mailer';
import { SUPPORT_EMAIL, site } from './site';

function esc(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

function fire(to: string, subject: string, lines: string[], link: string, linkLabel: string): void {
  if (!isMailConfigured()) return;
  const text = `${lines.join('\n\n')}\n\n${linkLabel}: ${link}\n\n${site.legalName}`;
  const html = `${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<p><a href="${link}">${esc(linkLabel)}</a></p><p>${esc(site.legalName)}</p>`;
  void sendMail({ to, subject, text, html }).catch((e: unknown) => console.error('[repair-notify]', e instanceof Error ? e.message : e));
}

/** Tell the store team something needs attention. */
export function notifyStaff(subject: string, line: string, adminPath: string): void {
  fire(SUPPORT_EMAIL, subject, [line], `${site.url}${adminPath}`, 'Open in the admin portal');
}

/** Tell the customer there is an update on their request. */
export function notifyCustomer(email: string, subject: string, line: string, accessCode: string): void {
  fire(email, subject, [line], `${site.url}/repairs/t/${accessCode}`, 'View your repair request');
}
