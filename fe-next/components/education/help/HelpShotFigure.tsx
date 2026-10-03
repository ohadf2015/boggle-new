import Image from 'next/image';
import { helpShot, type HelpShotId } from './shots';

export function HelpShotFigure({
  id,
  locale,
  alt,
  caption,
  priority = false,
}: {
  id: HelpShotId;
  locale: string;
  alt: string;
  caption?: string;
  priority?: boolean;
}) {
  const shot = helpShot(id, locale);
  const phone = shot.phone;
  return (
    <figure className={phone ? 'mx-auto max-w-[300px]' : 'w-full'}>
      <div className="overflow-hidden rounded-neo border-4 border-neo-cream/50 bg-neo-navy-light shadow-hard-lg">
        <Image
          src={shot.src}
          alt={alt}
          width={shot.width}
          height={shot.height}
          sizes={phone ? '300px' : '(min-width: 1024px) 720px, 100vw'}
          priority={priority}
          className="block h-auto w-full"
        />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-sm font-medium text-neo-gray-300">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
