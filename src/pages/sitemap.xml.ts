import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = (site?.toString() ?? 'https://tower.dev/').replace(/\/$/, '');
  const casesRu = await getCollection('cases-ru');
  const casesEn = await getCollection('cases-en');

  const today = '2026-10-10';

  const pages = [
    {
      loc: `${baseUrl}/`,
      lastmod: today,
      changefreq: 'daily',
      priority: '1.0',
      ru: `${baseUrl}/`,
      en: `${baseUrl}/en/`,
    },
    {
      loc: `${baseUrl}/en/`,
      lastmod: today,
      changefreq: 'daily',
      priority: '1.0',
      ru: `${baseUrl}/`,
      en: `${baseUrl}/en/`,
    },
    {
      loc: `${baseUrl}/privacy/`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.3',
      ru: `${baseUrl}/privacy/`,
      en: `${baseUrl}/en/privacy/`,
    },
    {
      loc: `${baseUrl}/en/privacy/`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.3',
      ru: `${baseUrl}/privacy/`,
      en: `${baseUrl}/en/privacy/`,
    },
  ];

  for (const c of casesRu) {
    pages.push({
      loc: `${baseUrl}/cases/${c.id}/`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
      ru: `${baseUrl}/cases/${c.id}/`,
      en: `${baseUrl}/en/cases/${c.id}/`,
    });
  }

  for (const c of casesEn) {
    pages.push({
      loc: `${baseUrl}/en/cases/${c.id}/`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
      ru: `${baseUrl}/cases/${c.id}/`,
      en: `${baseUrl}/en/cases/${c.id}/`,
    });
  }

  const urlsXml = pages
    .map(
      (p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${p.ru}" />
    <xhtml:link rel="alternate" hreflang="en" href="${p.en}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${p.ru}" />
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlsXml}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
