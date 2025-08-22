'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { FiUser, FiImage } from 'react-icons/fi';

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackIcon?: React.ReactNode;
  fallbackType?: 'icon' | 'placeholder';
}

export default function ImageWithFallback({ 
  src, 
  alt, 
  width, 
  height, 
  className = "", 
  fallbackIcon = <FiUser className="text-gray-500" />,
  fallbackType = 'icon'
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  // Comprehensive validation
  const isValidSrc = (() => {
    if (!src) {
      console.log('ImageWithFallback: No src provided');
      return false;
    }
    
    if (typeof src !== 'string') {
      console.log('ImageWithFallback: Src is not a string:', typeof src, src);
      return false;
    }
    
    if (!src.trim()) {
      console.log('ImageWithFallback: Src is empty string');
      return false;
    }
    
    if (src.includes('undefined') || src.includes('null') || src.includes('NaN')) {
      console.log('ImageWithFallback: Src contains invalid values:', src);
      return false;
    }
    
    // Try to validate as URL
    try {
      new URL(src);
      console.log('ImageWithFallback: Valid URL:', src);
      return true;
    } catch (error) {
      console.log('ImageWithFallback: Invalid URL:', src, error);
      return false;
    }
  })();

  // If no valid src or there was an error, show fallback
  if (!isValidSrc || hasError) {
    if (fallbackType === 'placeholder') {
      return (
        <div 
          className={`bg-gray-200 flex items-center justify-center overflow-hidden ${className}`}
          style={{ width, height }}
        >
          <FiImage className="text-gray-400" style={{ fontSize: Math.min(width, height) * 0.3 }} />
        </div>
      );
    }
    
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
    <>
      {isLoading && (
        <div 
          className={`bg-gray-200 flex items-center justify-center overflow-hidden ${className}`}
          style={{ width, height }}
        >
          <div className="animate-pulse bg-gray-300 rounded" style={{ width: width * 0.6, height: height * 0.6 }} />
        </div>
      )}
      <Image
        src={src as string}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          console.error('ImageWithFallback: Image failed to load:', src, e);
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </>
  );
} 