'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBookOpen, FaGithub, FaLinkedin } from 'react-icons/fa';
import { FaCartShopping, FaHouse, FaXTwitter } from 'react-icons/fa6';
import { cn } from './utils';

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-zinc-900/20 backdrop-blur-xs fixed flex gap-1 top-0 left-0 py-3 px-4 w-full *:not-[img]:p-2 z-20">
      <Link
        className={cn(
          'text-zinc-500 hover:text-zinc-300 active:text-zinc-400 transition-colors',
          pathname === '/' && 'text-white'
        )}
        title="Home"
        href="/"
      >
        <FaHouse />
      </Link>
      <Link
        className={cn(
          'text-zinc-500 hover:text-zinc-300 active:text-zinc-400 transition-colors',
          pathname === '/cv/' && 'text-white'
        )}
        href="/cv"
        title="CV"
      >
        <FaBookOpen />
      </Link>
      <Link
        className="text-zinc-500 hover:text-zinc-300 active:text-zinc-400 transition-colors mr-auto"
        target="_blank"
        href="https://quantizor.shop"
        title="Merch"
      >
        <FaCartShopping />
      </Link>
      <Link
        className="text-zinc-500 hover:text-zinc-300 active:text-zinc-400 transition-colors"
        target="_blank"
        title="X"
        href="https://x.com/quantizor"
      >
        <FaXTwitter />
      </Link>
      <Link
        className="text-zinc-500 hover:text-zinc-300 active:text-zinc-400 transition-colors"
        target="_blank"
        title="LinkedIn"
        href="https://www.linkedin.com/in/probablyup"
      >
        <FaLinkedin />
      </Link>
      <Link
        className="text-zinc-500 hover:text-zinc-300 active:text-zinc-400 transition-colors"
        target="_blank"
        title="GitHub"
        href="https://github.com/quantizor"
      >
        <FaGithub />
      </Link>

      <Link title="Also home" href="/" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <img src="/images/quantizor.svg" alt="quantizor's lab" className="size-9 shrink-0" />
      </Link>
    </nav>
  );
}
