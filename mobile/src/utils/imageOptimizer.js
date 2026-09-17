const API_BASE = 'https://milano.securehub.uz';

/**
 * Generates an optimized image URL using the server's /img endpoint.
 * Converts images to WebP and resizes them for mobile screens.
 * 
 * @param {string} rawUri - Original image path (e.g. '/uploads/abc.png' or full URL)
 * @param {Object} options - Optimization options
 * @param {number} options.width - Target width (default: 400)
 * @param {number} options.quality - Image quality 1-100 (default: 75)
 * @param {string} options.format - Output format: webp|jpeg|png (default: webp)
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUri(rawUri, { width = 400, quality = 75, format = 'webp' } = {}) {
  if (!rawUri) return rawUri;
  
  // Extract filename from various formats
  let filename;
  
  if (rawUri.startsWith('/uploads/')) {
    filename = rawUri.replace('/uploads/', '');
  } else if (rawUri.includes('/uploads/')) {
    // Full URL like https://milano.securehub.uz/uploads/abc.png
    const parts = rawUri.split('/uploads/');
    filename = parts[parts.length - 1];
  } else {
    // External URL or emoji - return as-is
    return rawUri;
  }
  
  return `${API_BASE}/img/${filename}?w=${width}&q=${quality}&f=${format}`;
}

/**
 * Presets for common image sizes used in the app
 */
export const ImageSize = {
  // Category chips (small icons)
  CHIP: { width: 80, quality: 70 },
  // Product card thumbnails
  THUMBNAIL: { width: 300, quality: 75 },
  // Product detail / modal images
  DETAIL: { width: 600, quality: 80 },
  // Banner images
  BANNER: { width: 200, quality: 75 },
  // Cart item images
  CART: { width: 200, quality: 70 },
  // Gift item images
  GIFT: { width: 250, quality: 75 },
};
