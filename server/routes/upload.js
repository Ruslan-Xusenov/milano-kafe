const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const { removeBackground } = require('@imgly/background-removal-node');

// Multer setup for temporary storage
const uploadDir = path.join(__dirname, '..', 'uploads');
const tempDir = path.join(uploadDir, 'temp');

// Ensure directories exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer with safe fileFilter and 5MB size limit
const upload = multer({
  dest: tempDir,
  limits: {
    fileSize: 5 * 1024 * 1024, // max 5MB
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

const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY || '';

router.post('/', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "Fayl hajmi 5MB dan oshmasligi kerak" });
      }
      return res.status(400).json({ error: err.message || "Fayl yuklashda xatolik" });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Rasm yuklanmadi' });
  }

  const inputPath = req.file.path;
  const fileName = `${uuidv4()}.png`;
  const outputPath = path.join(uploadDir, fileName);
  let success = false;

  try {
    // Attempt 1: Using remove.bg API
    console.log('[upload] remove.bg API orqali qirqish boshlandi...');
    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('image_file', fs.createReadStream(inputPath));

    const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      responseType: 'arraybuffer',
      validateStatus: false // Prevent throw on non-2xx
    });

    if (response.status === 200) {
      fs.writeFileSync(outputPath, response.data);
      console.log('[upload] remove.bg orqali muvaffaqiyatli qirqildi.');
      success = true;
    } else {
      console.warn('[upload] remove.bg xatolik:', response.status, response.data.toString());
      throw new Error('remove.bg failed');
    }
  } catch (error) {
    console.log('[upload] remove.bg ishlamadi. Local AI (imgly) ga o\'tilmoqda...', error.message);
    
    // Attempt 2: Local fallback with @imgly/background-removal-node
    try {
      // imgly accepts a local file path and returns a blob
      const blob = await removeBackground(inputPath);
      const buffer = Buffer.from(await blob.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
      console.log('[upload] Local AI orqali muvaffaqiyatli qirqildi.');
      success = true;
    } catch (localError) {
      console.error('[upload] Local AI ham ishlamadi:', localError.message);
      
      // Fallback: Just move the original file as is, but we want it transparent...
      // Well, if all fails, we just keep the original image (renamed to PNG to avoid missing file errors)
      // Actually, better to copy as is.
      const ext = path.extname(req.file.originalname) || '.png';
      const fallbackName = `${uuidv4()}${ext}`;
      const fallbackPath = path.join(uploadDir, fallbackName);
      fs.copyFileSync(inputPath, fallbackPath);
      
      // Clean up temp file
      fs.unlinkSync(inputPath);
      
      return res.status(200).json({
        url: `${process.env.VITE_API_URL || ''}/uploads/${fallbackName}`,
        warning: 'Fonni qirqish imkoni bo\'lmadi. Asl rasm saqlandi.'
      });
    }
  }

  // Cleanup temp file
  try {
    fs.unlinkSync(inputPath);
  } catch (e) {}

  if (success) {
    // Generate URL
    const host = process.env.VITE_API_URL || '';
    const imageUrl = `${host}/uploads/${fileName}`;
    return res.status(200).json({ url: imageUrl });
  }
});

module.exports = router;
