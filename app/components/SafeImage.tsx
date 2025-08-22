'use client';
import Image from 'next/image';
import { useState } from 'react';
import { FiUser } from 'react-icons/fi';

interface SafeImageProps {
  src: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export default function SafeImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = "", 
  fallbackIcon = <FiUser className="text-gray-500" />
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  // Additional validation to ensure src is a valid URL
  const isValidSrc = src && 
    typeof src === 'string' && 
    src.trim() !== '' && 
    !src.includes('undefined') && 
    !src.includes('null') && 
    !src.includes('NaN');

  // If no valid src or there was an error, show fallback
  if (!isValidSrc || hasError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center overflow-hidden ${className}`}
        style={{ width, height }}
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasError(true)}
    />
  );
} 