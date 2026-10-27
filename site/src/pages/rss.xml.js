import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { sortByDateDesc, benchmarkSlug } from '../lib/benchmarks';

export async function GET(context) {
  const benchmarks = (await getCollection('benchmarks')).sort(sortByDateDesc);
  return rss({
    title: 'Skrlr AI Lab — benchmark notes',
    description: 'Local AI benchmark write-ups with methods and caveats.',
    site: context.site,
    items: benchmarks.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      description: entry.data.caveats,
      link: `/benchmarks/${benchmarkSlug(entry)}/`,
    })),
  });
}
