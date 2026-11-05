'use client';

import { useState } from 'react';

export function Capture({ src, alt, tall = false }: { src: string; alt: string; tall?: boolean }) {
  const [failed, setFailed] = useState(false);
  const height = tall ? 'h-72' : 'h-44';
  return (
    <div className={`flex ${height} items-center justify-center overflow-hidden bg-paper`}>
      {failed ? (
        <p className="px-3 text-center text-xs leading-5 text-muted">This capture is not in the pack.</p>
      ) : (
        <img src={src} alt={alt} className="max-h-full w-full object-contain" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
