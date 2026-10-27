import type { CollectionEntry } from 'astro:content';

export type BenchmarkEntry = CollectionEntry<'benchmarks'>;

export function benchmarkSlug(entry: BenchmarkEntry): string {
  return entry.id.replace(/\.md$/, '');
}

export function formatValue(value: number | string, unit: string): string {
  return `${value} ${unit}`;
}

export function sortByDateDesc(a: BenchmarkEntry, b: BenchmarkEntry): number {
  return b.data.date.getTime() - a.data.date.getTime();
}

export function cardLabel(entry: BenchmarkEntry): string {
  return entry.data.card_label ?? entry.data.model_class.replace('-', ' ').toUpperCase();
}

export function cardDetail(entry: BenchmarkEntry): string {
  if (entry.data.card_detail) return entry.data.card_detail;
  return entry.data.hardware;
}
