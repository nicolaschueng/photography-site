import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCollection } from '../data/collections';
import { useReveal } from '../hooks/useReveal';

export default function CollectionDetail() {
  const { slug = '' } = useParams();
  const collection = getCollection(slug);

  if (!collection) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <p className="font-display text-2xl">Collection not found.</p>
        <Link
          to="/"
          className="mt-6 inline-block text-[12px] tracking-widest2 uppercase opacity-70 hover:opacity-100"
        >
          ← Back to works
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Back link */}
      <div className="mx-auto max-w-5xl px-5 sm:px-6 md:px-10 pt-6 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[12px] tracking-widest2 uppercase opacity-60 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      {/* Title block */}
      <header className="mx-auto max-w-3xl px-5 sm:px-6 md:px-10 pt-8 sm:pt-12 md:pt-16 pb-8 sm:pb-10 text-center">
        <p className="text-[11px] sm:text-[12px] tracking-widest2 uppercase opacity-55">
          {collection.category} · {collection.year}
        </p>
        <h1 className="mt-3 sm:mt-4 font-display text-3xl sm:text-4xl md:text-6xl tracking-tight leading-[1.15] md:leading-[1.1] break-words">
          {collection.title}
        </h1>
        <p className="mt-3 italic text-base sm:text-lg md:text-xl opacity-75">
          {collection.subtitle}
        </p>
        <p className="mx-auto mt-6 sm:mt-8 max-w-xl text-[14.5px] sm:text-[15px] md:text-[16px] leading-[1.9] md:leading-[1.95] opacity-80">
          {collection.description}
        </p>
        <div className="mt-8 sm:mt-10 flex justify-center">
          <span className="rule w-16" />
        </div>
      </header>

      {/* Photo stream — gallery style, single column for storytelling */}
      <section className="mx-auto max-w-3xl md:max-w-4xl px-5 sm:px-6 md:px-10">
        {collection.photos.map((photo, i) => (
          <PhotoBlock key={i} index={i} photo={photo} />
        ))}
      </section>

      {/* End mark */}
      <div className="mx-auto max-w-3xl px-5 sm:px-6 md:px-10 mt-16 sm:mt-24 text-center">
        <span className="font-display text-2xl opacity-50">— fin —</span>
      </div>
    </div>
  );
}

function PhotoBlock({
  photo,
  index,
}: {
  photo: import('../data/collections').Photo;
  index: number;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="fade-in mt-12 sm:mt-16 md:mt-24 first:mt-0">
      <div className="bg-black/5 dark:bg-white/5">
        <img
          src={photo.src}
          alt={photo.caption}
          loading="lazy"
          className="w-full h-auto object-cover"
        />
      </div>
      <div className="mt-4 sm:mt-5 md:mt-6 max-w-2xl mx-auto">
        <p className="text-[11px] sm:text-[12px] tracking-widest2 uppercase opacity-55">
          No.{String(index + 1).padStart(2, '0')}
          {photo.location ? ` · ${photo.location}` : ''}
          {photo.year ? ` · ${photo.year}` : ''}
        </p>
        <p className="mt-2 sm:mt-3 font-serif text-base sm:text-lg md:text-xl leading-[1.7] italic">
          {photo.caption}
        </p>
        {photo.story && (
          <p className="mt-2 sm:mt-3 text-[14.5px] sm:text-[15px] md:text-[15.5px] leading-[1.9] md:leading-[1.95] opacity-80">
            {photo.story}
          </p>
        )}
      </div>
    </div>
  );
}
