'use client';

import Title from './components/Title';

export default function NotFound() {
  return (
    <div className="flex flex-col h-full justify-center gap-6 text-center">
      <Title>404</Title>
      <h1 className="text-amber-400 text-2xl font-bold">You seem lost</h1>
      <p>You don&apos;t have to go home, but there&apos;s more to do elsewhere (↰)</p>
    </div>
  );
}
