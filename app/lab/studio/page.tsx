'use client';

import GeometryStudio from './NDimensionalGeometrySimulator';

export default function StudioPage() {
  return (
    <div className="fixed inset-0 bg-black">
        <GeometryStudio />
    </div>
  );
}
