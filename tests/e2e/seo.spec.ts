import { expect, test } from '@playwright/test';

test('validates SEO tags, Open Graph, and Schema.org on Russian home page', async ({ page }) => {
  await page.goto('/?tier=static');

  // Canonical and alternates
  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute('href', 'https://tower.dev/');

  const hreflangRu = page.locator('link[rel="alternate"][hreflang="ru"]');
  await expect(hreflangRu).toHaveAttribute('href', 'https://tower.dev/');

  const hreflangEn = page.locator('link[rel="alternate"][hreflang="en"]');
  await expect(hreflangEn).toHaveAttribute('href', 'https://tower.dev/en/');

  const hreflangDefault = page.locator('link[rel="alternate"][hreflang="x-default"]');
  await expect(hreflangDefault).toHaveAttribute('href', 'https://tower.dev/');

  // Open Graph
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Башня/);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'ru_RU');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://tower.dev/',
  );

  // Twitter Cards
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );

  // Schema.org JSON-LD
  const jsonLdContent = await page.locator('script[type="application/ld+json"]').textContent();
  expect(jsonLdContent).toBeTruthy();
  const parsed = JSON.parse(jsonLdContent as string);
  expect(parsed['@context']).toBe('https://schema.org');
  expect(Array.isArray(parsed['@graph'])).toBe(true);

  const org = parsed['@graph'].find(
    (item: { '@type': string }) => item['@type'] === 'Organization',
  );
  expect(org).toBeTruthy();
  expect(org.name).toBe('Башня');
  expect(org.founder).toHaveLength(3);
  expect(org.hasOfferCatalog.itemListElement).toHaveLength(4);
});

test('validates SEO tags and hreflang on English home page', async ({ page }) => {
  await page.goto('/en/?tier=static');

  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute('href', 'https://tower.dev/en/');

  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
});

test('robots.txt and sitemap.xml are served and valid', async ({ request }) => {
  const robotsRes = await request.get('/robots.txt');
  expect(robotsRes.status()).toBe(200);
  const robotsText = await robotsRes.text();
  expect(robotsText).toContain('User-agent: *');
  expect(robotsText).toContain('Allow: /');
  expect(robotsText).toContain('Sitemap: https://tower.dev/sitemap.xml');

  const sitemapRes = await request.get('/sitemap.xml');
  expect(sitemapRes.status()).toBe(200);
  const sitemapText = await sitemapRes.text();
  expect(sitemapText).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  expect(sitemapText).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  expect(sitemapText).toContain('<loc>https://tower.dev/</loc>');
  expect(sitemapText).toContain('<loc>https://tower.dev/en/</loc>');
  expect(sitemapText).toContain('<loc>https://tower.dev/cases/med-agent/</loc>');
  expect(sitemapText).toContain('<loc>https://tower.dev/en/cases/med-agent/</loc>');
  expect(sitemapText).toContain('<loc>https://tower.dev/privacy/</loc>');
});
