/**
 * Calendar dates as ISO strings (YYYY-MM-DD) in the phone's local time —
 * the same shape Postgres `date` columns use, so nothing drifts through a
 * timezone conversion on the way to book_rental.
 */
import type { Lang } from '../state/types';

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Inclusive day count: the 2nd to the 4th is 3 days. */
export const daysBetween = (from: string, to: string) =>
  Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 86_400_000) + 1;

/** Tomorrow for three days: a sensible starting selection. */
export const defaultDates = (): [string, string] => [addDays(todayISO(), 1), addDays(todayISO(), 3)];

/** The days of a month laid out Monday-first, with nulls for the leading blanks. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => toISO(new Date(year, month, i + 1))),
  ];
}

const LOCALE: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' };

export const monthLabel = (year: number, month: number, lang: Lang) => {
  const s = new Intl.DateTimeFormat(LOCALE[lang], { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const weekdayLetters = (lang: Lang) =>
  // 2024-01-01 was a Monday.
  Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)),
  );

export function rangeLabel(from: string, to: string, lang: Lang) {
  const f = new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short' });
  return `${f.format(fromISO(from))} – ${f.format(fromISO(to))}`;
}

export const dateTimeLabel = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
