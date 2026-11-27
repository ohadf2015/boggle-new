import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  defaultSrc: string;
  defaultWidth: number;
  defaultHeight: number;
  sizes: string;
  className?: string;
}

const ART = [
  { key: 'hanukkah', src: '/holidays/m-hanukkah.webp', width: 416, height: 512 },
  { key: 'christmas', src: '/holidays/m-christmas.webp', width: 512, height: 443 },
] as const;

export default function HolidayMascot({ defaultSrc, defaultWidth, defaultHeight, sizes, className }: Props) {
  return (
    <>
      <Image
        src={defaultSrc}
        alt=""
        width={defaultWidth}
        height={defaultHeight}
        loading="eager"
        sizes={sizes}
        className={cn('holiday-mascot-default', className)}
      />
      {ART.map((a) => (
        <Image
          key={a.key}
          src={a.src}
          alt=""
          width={a.width}
          height={a.height}
          loading="lazy"
          sizes={sizes}
          className={cn(`holiday-mascot-${a.key}`, className)}
        />
      ))}
    </>
  );
}
