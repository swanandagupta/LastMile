import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="ops-panel p-4 space-y-3">
    <div className="h-3 w-24 rounded bg-white/5 skeleton-shimmer" />
    <div className="h-6 w-16 rounded bg-white/5 skeleton-shimmer" />
    <div className="h-2 w-32 rounded bg-white/5 skeleton-shimmer" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="ops-panel overflow-hidden p-3 space-y-2">
    <div className="h-5 w-full rounded bg-white/5 skeleton-shimmer" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-9 w-full rounded bg-white/5 skeleton-shimmer" />
    ))}
  </div>
);
