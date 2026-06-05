import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { collections } from '../data/collections';
import { useReveal } from '../hooks/useReveal';
import { asset } from '../utils/asset';

type Filter = 'all' | '人文' | '风光';

export default function Home() {
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const arr =
      filter === 'all'
        ? collections
        : collections.filter((c) => c.category === filter);
    // 按 year 降序;同一年保持原顺序
    return [...arr].sort((a, b) => Number(b.year) - Number(a.year));
  }, [filter]);

  const counts = useMemo(
    () => ({
      all: collections.length,
      人文: collections.filter((c) => c.category === '人文').length,
      风光: collections.filter((c) => c.category === '风光').length,
    }),
    []
  );

  return (
    <div className="page-enter">
      {/* Hero: avatar + signature + intro */}
      <section className="mx-auto max-w-3xl px-6 sm:px-6 md:px-10 pt-8 sm:pt-14 md:pt-24 pb-8 sm:pb-12 md:pb-20 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={asset('/avatar/me-hd.jpg')}
              alt="Dirty_Sheep"
              className="w-[72px] h-[72px] sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover"
            />
            <span className="absolute inset-0 rounded-full ring-1 ring-black/15 dark:ring-white/15 pointer-events-none" />
          </div>
        </div>

        <h1 className="mt-5 sm:mt-8 font-display text-xl sm:text-2xl md:text-3xl tracking-tight">
          Dirty_Sheep
        </h1>

        <p className="signature mt-5 sm:mt-8 text-base sm:text-xl md:text-2xl opacity-90">
          "行且看,定风波"
        </p>

        <div className="mt-7 sm:mt-12 flex justify-center">
          <span className="rule w-12 sm:w-16" />
        </div>
      </section>

      {/* Collections grid */}
      <section className="mx-auto max-w-6xl px-6 sm:px-6 md:px-10 pb-10">
        <div className="mb-10 sm:mb-10 md:mb-12 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-lg sm:text-xl md:text-2xl tracking-wide">
            Collections
          </h2>
          <div className="flex items-center gap-4 sm:gap-5 text-[11px] sm:text-[12px] tracking-widest2 uppercase">
            <FilterTab
              label={`All · ${counts.all}`}
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterTab
              label={`人文 · ${counts['人文']}`}
              active={filter === '人文'}
              onClick={() => setFilter('人文')}
            />
            <FilterTab
              label={`风光 · ${counts['风光']}`}
              active={filter === '风光'}
              onClick={() => setFilter('风光')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-16 sm:gap-y-20 md:gap-y-24">
          {list.map((c, i) => (
            <CollectionCard key={c.slug} index={i} {...c} />
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`transition-opacity ${
        active ? 'opacity-100' : 'opacity-50 hover:opacity-80'
      }`}
    >
      <span className="relative">
        {label}
        {active && (
          <span className="absolute -bottom-1 left-0 right-0 h-px bg-current" />
        )}
      </span>
    </button>
  );
}

function CollectionCard({
  slug,
  title,
  subtitle,
  cover,
  category,
  year,
  photos,
  index,
}: (typeof import('../data/collections'))['collections'][number] & {
  index: number;
}) {
  const ref = useReveal<HTMLAnchorElement>();
  const previews = photos.filter((p) => p.src !== cover).slice(0, 3);
  return (
    <Link
      ref={ref}
      to={`/collection/${slug}`}
      className={`fade-in cover-card group block ${
        index % 3 === 1 ? 'sm:mt-12' : ''
      }`}
    >
      <div className="overflow-hidden bg-black/5 dark:bg-white/5 aspect-[4/5] sm:aspect-auto rounded-sm sm:rounded-none">
        <img
          src={asset(cover)}
          alt={title}
          loading="lazy"
          className="cover-img w-full h-full sm:h-[400px] md:h-[440px] object-cover"
        />
      </div>

      {previews.length > 0 && (
        <div className="mt-1.5 sm:mt-2 grid grid-cols-3 gap-1 sm:gap-1.5">
          {previews.map((p, idx) => (
            <div
              key={idx}
              className="aspect-square overflow-hidden bg-black/5 dark:bg-white/5 rounded-sm"
            >
              <img
                src={asset(p.src)}
                alt=""
                loading="lazy"
                className="preview-img w-full h-full object-cover opacity-95"
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 sm:mt-5 flex items-baseline justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-base sm:text-xl md:text-2xl tracking-tight truncate">
            {title}
          </h3>
          <p className="mt-1 text-[12.5px] sm:text-[14px] italic opacity-70 truncate">{subtitle}</p>
        </div>
        <div className="text-right text-[10px] sm:text-[11px] tracking-widest2 uppercase opacity-55 shrink-0">
          <div>{category}</div>
          <div className="mt-0.5">
            {year} · {photos.length}p
          </div>
        </div>
      </div>
    </Link>
  );
}
