import { notFound } from 'next/navigation';

/** Unknown URLs here get the section 404, not the site-wide one that links to the game home. */
export default function MissingPage(): never {
  notFound();
}
