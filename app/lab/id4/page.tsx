import { generateMetadata } from '@/utils';
import Client from './view';

export const metadata = generateMetadata('huetiful');

export default function Page() {
  return <Client />;
}
