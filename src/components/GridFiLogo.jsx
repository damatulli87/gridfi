import React from 'react';

export default function GridFiLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#1d4ed8"/>
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#3b82f6" opacity="0.45"/>
      <rect x="18" y="4" width="10" height="10" rx="2" fill="#3b82f6" opacity="0.45"/>
      <rect x="4" y="18" width="10" height="10" rx="2" fill="#3b82f6" opacity="0.45"/>
      <rect x="18" y="18" width="10" height="10" rx="2" fill="#3b82f6" opacity="0.45"/>
      <path d="M19 4L10 16h6.5L14 28l13-16h-7L19 4z" fill="#4ade80"/>
    </svg>
  );
}
