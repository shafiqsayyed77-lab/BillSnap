/**
 * Skeleton Loader Component (Skeleton.jsx)
 * ----------------------------------------
 * Smooth shimmer skeleton placeholders used while fetching data from the API.
 */

import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-lilac-surface border border-lilac-border rounded-3xl p-5 space-y-4 shadow-soft">
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <Skeleton className="w-40 h-8" />
      <Skeleton className="w-full h-3 rounded-full" />
      <div className="flex justify-between pt-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-20 h-4" />
      </div>
    </div>
  );
};

export const BillItemSkeleton = () => {
  return (
    <div className="flex items-center justify-between p-4 bg-lilac-surface border border-lilac-border rounded-2xl">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="w-28 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="w-16 h-4 ml-auto" />
        <Skeleton className="w-12 h-3 ml-auto" />
      </div>
    </div>
  );
};

export default Skeleton;
