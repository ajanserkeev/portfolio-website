interface Lhr {
  requestedUrl: string;
  categories: { performance: { score: number | null } };
  audits: Record<
    string,
    {
      numericValue?: number;
      details?: {
        items?: Array<{ groupLabel?: string; url?: string; duration?: number; total?: number }>;
      };
    }
  >;
}

const value = (lhr: Lhr, audit: string) => lhr.audits[audit]?.numericValue ?? Number.NaN;

/** GitHub annotation lines for the median run (by performance score) of each URL. */
export function summarizeLighthouse(reports: readonly Lhr[]): string[] {
  if (reports.length === 0) return ['::warning title=Lighthouse::no reports found'];
  const byUrl = new Map<string, Lhr[]>();
  for (const report of reports) {
    byUrl.set(report.requestedUrl, [...(byUrl.get(report.requestedUrl) ?? []), report]);
  }
  return [...byUrl].flatMap(([url, runs]) => {
    const sorted = [...runs].sort(
      (a, b) => (a.categories.performance.score ?? 0) - (b.categories.performance.score ?? 0),
    );
    const median = sorted[Math.floor(sorted.length / 2)] as Lhr;
    const ms = (audit: string) => `${Math.round(value(median, audit))} ms`;
    const work = (median.audits['mainthread-work-breakdown']?.details?.items ?? [])
      .slice(0, 4)
      .map((item) => `${item.groupLabel} ${Math.round(item.duration ?? 0)} ms`);
    const scripts = (median.audits['bootup-time']?.details?.items ?? [])
      .slice(0, 4)
      .map(
        (item) =>
          `${(item.url ?? '').replace(/^https?:\/\/[^/]+\//, '')} ${Math.round(item.total ?? 0)} ms`,
      );
    return [
      `::notice title=Lighthouse ${url}::performance ${(median.categories.performance.score ?? 0).toFixed(2)} · FCP ${ms('first-contentful-paint')} · LCP ${ms('largest-contentful-paint')} · TBT ${ms('total-blocking-time')} · CLS ${value(median, 'cumulative-layout-shift').toFixed(3)}`,
      `::notice title=Lighthouse main thread ${url}::${[...work, ...scripts].join(' · ')}`,
    ];
  });
}
