import { Metadata } from 'next';
import { twMerge } from 'tailwind-merge';

const base = "quantizor's lab";

export const cn = (...classes: (string | false | null | undefined)[]) => {
  return twMerge(classes.filter(Boolean));
};

export const generateMetadata = (title?: string, description?: string, overrides?: Partial<Metadata>): Metadata => {
  return {
    title: title ? `${title} ← ${base}` : base,
    description: description || 'The personal website of Evan Jacobs, TypeScript engineer and engineering consultant.',
    icons: ['/favicon.png'],
    ...overrides,
  };
};
