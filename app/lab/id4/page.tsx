import type { Metadata } from 'next';
import Client from './client';

export const metadata: Metadata = {
  title: "huetiful ← quantizor's lab",
};

export default function Page() {
  return <Client />;
}
