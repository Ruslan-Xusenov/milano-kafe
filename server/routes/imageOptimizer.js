const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('sharp not available, image optimization disabled');
}

const uploadDir = path.join(__dirname, '..', 'uploads');
const cacheDir = path.join(__dirname, '..', 'uploads', '.cache');

// Create cache directory
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

/**
 * GET /img/:filename?w=400&q=80&f=webp
 * 
 * Dynamically resizes and converts images.
 * Results are cached to disk for subsequent requests.
 * 
 * Query params:
 *   w - width (default: original, max: 1200)
 *   q - quality (default: 80, range: 1-100)
 *   f - format: webp | jpeg | png (default: webp)
 */
router.get('/:filename', async (req, res) => {
  if (!sharp) {
    // Fallback: serve original file
    const originalPath = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    return res.sendFile(originalPath);
  }

  try {
    const { filename } = req.params;
    const width = Math.min(parseInt(req.query.w) || 0, 1200) || null;
    const quality = Math.min(Math.max(parseInt(req.query.q) || 80, 1), 100);
    const format = ['webp', 'jpeg', 'png'].includes(req.query.f) ? req.query.f : 'webp';

    const originalPath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Prevent path traversal
    const resolvedPath = path.resolve(originalPath);
    if (!resolvedPath.startsWith(path.resolve(uploadDir))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Build cache key
    const cacheKey = `${path.parse(filename).name}_w${width || 'orig'}_q${quality}.${format}`;
    const cachePath = path.join(cacheDir, cacheKey);

    // Serve from cache if exists
    if (fs.existsSync(cachePath)) {
      const mimeTypes = { webp: 'image/webp', jpeg: 'image/jpeg', png: 'image/png' };
      res.set({
        'Content-Type': mimeTypes[format],
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Image-Cache': 'HIT',
      });
      return res.sendFile(cachePath);
    }

    // Process image
    let pipeline = sharp(originalPath);

    if (width) {
      pipeline = pipeline.resize(width, null, { 
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    switch (format) {
      case 'webp':
        pipeline = pipeline.webp({ quality, effort: 4 });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality, compressionLevel: 6 });
        break;
    }

    const buffer = await pipeline.toBuffer();
    
    // Write to cache asynchronously
    fs.writeFile(cachePath, buffer, (err) => {
      if (err) console.error('Cache write error:', err);
    });

    const mimeTypes = { webp: 'image/webp', jpeg: 'image/jpeg', png: 'image/png' };
    res.set({
      'Content-Type': mimeTypes[format],
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Image-Cache': 'MISS',
    });
    res.send(buffer);

  } catch (error) {
    console.error('Image processing error:', error);
    // Fallback: serve original
    const originalPath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(originalPath)) {
      return res.sendFile(originalPath);
    }
    res.status(500).json({ error: 'Image processing failed' });
  }
});

module.exports = router;
