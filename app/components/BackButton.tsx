'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BackButton() {
  const pathname = usePathname();
  const showBackButton = pathname !== '/';

  if (!showBackButton) return null;

  return (
    <Link
      href="/"
      className="relative md:absolute top-4 left-4 leading-none text-2xl z-20 print:hidden"
      title="Back to index"
    >
      ↰
    </Link>
  );
}
