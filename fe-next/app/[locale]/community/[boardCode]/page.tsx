
import { notFound } from 'next/navigation';
import BoardPlayPageClient from './PageClient';

interface Props {
  params: { boardCode: string; locale: string };
}

export default function BoardPlayPage({ params }: Props) {
  const { boardCode } = params;
  if (!boardCode) notFound();
  return <BoardPlayPageClient boardCode={boardCode} />;
}
