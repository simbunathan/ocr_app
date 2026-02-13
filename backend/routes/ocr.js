const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const ocrController = require('../controllers/ocrController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|jfif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/process', auth, upload.single('image'), ocrController.processOCR);
router.get('/history', auth, ocrController.getHistory);
router.delete('/record/:id', auth, ocrController.deleteRecord);
router.get('/export/pdf/:id', auth, ocrController.exportToPDF);
router.get('/export/excel/:id', auth, ocrController.exportToExcel);

module.exports = router;