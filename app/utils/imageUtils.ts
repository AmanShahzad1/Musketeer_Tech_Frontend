/**
 * Safely constructs an image URL from a backend file path
 * @param imagePath - The image path from the backend
 * @returns A safe image URL or null if invalid
 */
export function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath || typeof imagePath !== 'string' || !imagePath.trim()) {
    console.log('getImageUrl: Invalid imagePath:', imagePath);
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const cleanPath = imagePath.replace(/\\/g, '/').trim();
  
  if (!cleanPath) {
    console.log('getImageUrl: Empty cleanPath after trimming');
    return null;
  }

  try {
    // Ensure the path doesn't start with a slash to avoid double slashes
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
    const finalUrl = `${baseUrl}/${normalizedPath}`;
    
    // Additional validation - check for common problematic patterns
    if (finalUrl.includes('undefined') || finalUrl.includes('null') || finalUrl.includes('NaN')) {
      console.error('getImageUrl: URL contains invalid values:', finalUrl);
      return null;
    }
    
    // Validate the final URL
    new URL(finalUrl);
    
    console.log('getImageUrl: Constructed URL:', finalUrl);
    return finalUrl;
  } catch (error) {
    console.error('getImageUrl: Error constructing or validating URL:', error, 'for path:', imagePath);
    return null;
  }
}

/**
 * Checks if an image path is valid and can be displayed
 * @param imagePath - The image path to validate
 * @returns True if the image path is valid
 */
export function isValidImagePath(imagePath: string | null | undefined): boolean {
  return getImageUrl(imagePath) !== null;
} 