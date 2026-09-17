const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('sharp not available, upload optimization disabled');
}

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Always save as .webp if sharp is available
    const ext = sharp ? '.webp' : (path.extname(file.originalname) || '.png');
    cb(null, `${uuidv4()}${ext}`)
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // max 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari (JPEG, PNG, WEBP, GIF) qabul qilinadi'));
    }
  },
});

router.post('/', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "Fayl hajmi 10MB dan oshmasligi kerak" });
      }
      return res.status(400).json({ error: err.message || "Fayl yuklashda xatolik" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Rasm yuklanmadi' });
    }

    const filePath = req.file.path;

    // Optimize with sharp if available
    if (sharp) {
      try {
        const optimizedFilename = `${uuidv4()}.webp`;
        const optimizedPath = path.join(uploadDir, optimizedFilename);

        await sharp(filePath)
          .resize(1200, 1200, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .webp({ quality: 82, effort: 4 })
          .toFile(optimizedPath);

        // Remove original uploaded file
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Failed to delete original:', unlinkErr);
        });

        const host = process.env.VITE_API_URL || '';
        const imageUrl = `${host}/uploads/${optimizedFilename}`;
        return res.status(200).json({ url: imageUrl });
      } catch (optimizeErr) {
        console.error('Image optimization failed, serving original:', optimizeErr);
        // Fall through to serve original
      }
    }

    const host = process.env.VITE_API_URL || '';
    const imageUrl = `${host}/uploads/${req.file.filename}`;
    return res.status(200).json({ url: imageUrl });
  });
});

module.exports = router;
