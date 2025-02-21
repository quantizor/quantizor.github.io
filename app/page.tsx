'use client';

import { useEffect, useState } from 'react';
import Content from './content/index.mdx';
import { views } from './views';

import { Cedarville_Cursive } from 'next/font/google';
import Link from 'next/link';
import { cn } from './utils';

const font = Cedarville_Cursive({
  weight: '400',
  subsets: ['latin'],
});

export default function Home() {
  const [currentView, setCurrentView] = useState(views[0]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setCurrentView((current) => {
        const currentIndex = views.indexOf(current);
        return currentIndex >= views.length - 1 ? views[0] : views[currentIndex + 1];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paused]);

  return (
    <>
      <main className="prose prose-invert mx-auto px-4 text-center md:text-left text-balance md:text-pretty">
        <Content
          components={{ h1: ({ children }) => <h1 className={cn('text-4xl', font.className)}>{children}</h1> }}
        />
      </main>

      <section className="flex grow md:justify-center items-center max-h-screen text-center mt-14 mx-auto p-4">
        <pre
          className="text-[1.5vw] absolute max-w-full left-0 right-0 md:text-xs"
          onPointerOut={() => setPaused(false)}
          onPointerOver={() => setPaused(true)}
        >
          {currentView}
        </pre>
      </section>

      <footer className="flex flex-wrap gap-5 justify-center text-center self-center mt-30 pb-14">
        <Link className="button" href="/lab/id1">
          ID1
        </Link>
        <Link className="button rainbow-border" href="/lab/id2">
          <span className="rainbow-text">Prismoku</span>
        </Link>
        <Link className="button huetiful-border" href="/lab/id4">
          <span>huetiful</span>
        </Link>
      </footer>
    </>
  );
}
