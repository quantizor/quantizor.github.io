'use client';

import Link from 'next/link';
import Title from './components/Title';
import Visualization from './components/404Viz';

import { Cedarville_Cursive } from 'next/font/google';

const font = Cedarville_Cursive({
  weight: '400',
  subsets: ['latin'],
});

export default function NotFound() {
  return (
    <>
      <Visualization />
      <div className="relative flex flex-col mt-auto gap-6 text-center">
        <Title>404</Title>
        <h1 className={`${font.className} text-5xl leading-loose font-bold`}>you seem lost...</h1>
        <p>You don&apos;t have to go home, there&apos;s more to do <Link href="/">elsewhere</Link></p>
      </div>
    </>
  );
}
