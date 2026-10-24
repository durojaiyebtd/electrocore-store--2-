/**
 * Editable storefront content. Stored as one SiteSetting row; anything not saved yet falls back to the defaults.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/site-content';

const KEY = 'site-content';

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });
    const stored = (row?.value ?? {}) as Partial<SiteContent>;
    return { ...DEFAULT_SITE_CONTENT, ...stored };
  } catch {
    // The storefront must never fail to load just because the content row could not be read
    return DEFAULT_SITE_CONTENT;
  }
}

export async function saveSiteContent(content: SiteContent): Promise<SiteContent> {
  // SiteContent is plain JSON; Prisma's Json type needs an index signature, so cast explicitly
  const value = content as unknown as Prisma.InputJsonObject;
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value },
    update: { value },
  });
  return content;
}
