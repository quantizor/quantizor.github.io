'use client';

import { useEffect, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import { views } from './views';
import SiteTitle from './components/Title';

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
      <SiteTitle />
      <main className="flex grow md:justify-center items-center max-h-screen text-center mx-auto p-4">
        <pre
          className="text-[1.5vw] absolute max-w-full md:text-xs text-amber-400"
          onPointerOut={() => setPaused(false)}
          onPointerOver={() => setPaused(true)}
        >
          {currentView}
        </pre>
      </main>

      <footer className="flex flex-wrap gap-5 justify-center text-center self-center absolute top-[40vh] md:top-3/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <a className="button" href="/cv">
          CV
        </a>
        <a className="button" href="/lab/id1">
          ID1
        </a>
        <a className="button rainbow-border" href="/lab/id2">
          <span className="rainbow-text">Prismoku</span>
        </a>
        <a className="button huetiful-border" href="/lab/id4">
          <span>huetiful</span>
        </a>
      </footer>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-5 items-center">
        <a title="GitHub" href="https://github.com/quantizor" target="_blank" rel="noopener noreferrer">
          <FaGithub size={24} />
        </a>

        <a title="X/Twitter" href="https://x.com/quantizor" target="_blank" rel="noopener noreferrer">
          <span className="text-[20px]">𝕏</span>
        </a>
      </div>
    </>
  );
}
