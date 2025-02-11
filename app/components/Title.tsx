'use client';

import { useEffect } from 'react';

interface TitleProps {
  children?: React.ReactNode;
}

export default function SiteTitle({ children }: TitleProps) {
  const title = [children, "quantizor's lab"].filter(Boolean).join(' ← ');

  useEffect(() => {
    document.title = title;
  }, [title]);

  // Return null to avoid affecting the DOM
  return null;
}
