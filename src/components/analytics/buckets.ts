// Groups per-day analytics rows into chart buckets: daily for short
// ranges, weekly for anything longer so bars stay readable on mobile.

export type Bucket = { label: string; start: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function buildBuckets(
  rangeDays: number | null,
  earliestDay: string | null,
): { buckets: Bucket[]; stepDays: number } {
  const today = startOfToday();
  const rangeStart = rangeDays
    ? new Date(today.getTime() - (rangeDays - 1) * DAY_MS)
    : earliestDay
      ? parseDay(earliestDay)
      : new Date(today.getTime() - 13 * DAY_MS);

  const spanDays = Math.round((today.getTime() - rangeStart.getTime()) / DAY_MS) + 1;
  const stepDays = spanDays <= 31 ? 1 : 7;

  // Walk backwards from today so the last bucket always ends today
  const buckets: Bucket[] = [];
  for (
    let end = today.getTime();
    end >= rangeStart.getTime();
    end -= stepDays * DAY_MS
  ) {
    const start = new Date(end - (stepDays - 1) * DAY_MS);
    buckets.unshift({
      start,
      label: start.toLocaleDateString([], { month: "short", day: "numeric" }),
    });
  }
  return { buckets, stepDays };
}

/** Index into `buckets` for a YYYY-MM-DD day, or -1 if out of range. */
export function bucketIndex(
  day: string,
  buckets: Bucket[],
  stepDays: number,
): number {
  if (buckets.length === 0) return -1;
  const idx = Math.floor(
    (parseDay(day).getTime() - buckets[0].start.getTime()) / (stepDays * DAY_MS),
  );
  return idx >= 0 && idx < buckets.length ? idx : -1;
}
