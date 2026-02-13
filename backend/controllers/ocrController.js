const Tesseract = require('tesseract.js');
const path = require('path');
const { OcrRecord } = require('../models');
const { dbType } = require('../config/db');

/**
 * Process OCR on uploaded image
 */
exports.processOCR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // --- Resolve userId safely from multiple possible locations ---
    const userId = req.userId || req.user?.id || req.user?.userId || req.body?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing userId from request' });
    }

    const imagePath = req.file.path;
    console.log('🧩 OCR Start:', { userId, imagePath });

    // --- Create initial record with "processing" status ---
    const record = await OcrRecord.create({
      userId,
      imagePath,
      status: 'processing',
      language: 'eng'
    });

    // --- Perform OCR recognition ---
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: info => console.log(info)
    });

    const { data } = result;
    const rawText = (data && data.text) ? data.text.trim() : '';

    let formattedText = '';

    if (data && Array.isArray(data.words) && data.words.length > 0) {
      const linesMap = data.words.reduce((acc, word) => {
        const yKey = Math.round(word.bbox.y0 / 10);
        if (!acc[yKey]) acc[yKey] = [];
        acc[yKey].push(word);
        return acc;
      }, {});

      const sortedRowKeys = Object.keys(linesMap).map(k => parseInt(k, 10)).sort((a, b) => a - b);
      for (const key of sortedRowKeys) {
        const wordsOnLine = linesMap[key].sort((a, b) => a.bbox.x0 - b.bbox.x0);
        let line = '';
        let lastX = 0;
        wordsOnLine.forEach(word => {
          const x = word.bbox.x0;
          const gap = Math.max(1, Math.round((x - lastX) / 20));
          line = line.padEnd(line.length + gap, ' ');
          line += word.text;
          lastX = x + (word.text?.length || 0) * 7;
        });
        formattedText += line.trimEnd() + '\n';
      }
      formattedText = formattedText.trim();
    } else if (rawText) {
      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter((l, i) => !(l === '' && i === 0));
      const formattedLines = lines.map(line => {
        if (/\t/.test(line) || /\s{2,}/.test(line)) {
          return line.replace(/\t/g, '    ');
        }
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          const colWidths = [10, 10, 20, 10, 10];
          let out = '';
          for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            const width = colWidths[Math.min(i, colWidths.length - 1)];
            out += p.padEnd(width, ' ');
          }
          return out.trimEnd();
        }
        return line;
      });
      formattedText = formattedLines.join('\n').trim();
    } else {
      formattedText = '';
    }

    const finalText = (formattedText && formattedText.length > 0) ? formattedText : rawText;

    // Update DB record - DB agnostic update
    if (dbType === 'mysql') {
      await record.update({
        extractedText: finalText,
        confidence: data?.confidence || 0,
        status: 'completed'
      });
    } else {
      record.extractedText = finalText;
      record.confidence = data?.confidence || 0;
      record.status = 'completed';
      await record.save();
    }

    console.log('✅ OCR Completed for record:', record.id || record._id);

    res.json({
      message: 'OCR processing completed successfully',
      recordId: record.id || record._id,
      text: finalText,
      confidence: data?.confidence,
      imagePath: `/uploads/${path.basename(req.file.path)}`
    });
  } catch (error) {
    console.error('❌ OCR processing error:', error);

    if (req.file && (req.userId || req.user?.id || req.user?.userId)) {
      try {
        await OcrRecord.create({
          userId: req.userId || req.user?.id || req.user?.userId,
          imagePath: req.file.path,
          status: 'failed'
        });
      } catch (e) {
        console.error('⚠️ Failed to create fallback failed-status record:', e);
      }
    }

    res.status(500).json({ error: 'Error processing image' });
  }
};

/**
 * Fetch all OCR history for the logged-in user
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Missing userId' });

    let records;
    if (dbType === 'mysql') {
      records = await OcrRecord.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });
    } else {
      records = await OcrRecord.find({ userId }).sort({ createdAt: -1 });
    }

    res.json({ records });
  } catch (error) {
    console.error('❌ Error fetching OCR history:', error);
    res.status(500).json({ error: 'Error fetching OCR history' });
  }
};

/**
 * Export OCR record to PDF
 */
exports.exportToPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user?.id || req.user?.userId;
    console.log(`📄 Exporting record ${id} to PDF for user ${userId}`);

    const record = await OcrRecord.findOne(dbType === 'mysql' ? { where: { id, userId } } : { _id: id, userId });

    if (!record) {
      console.error(`❌ Record ${id} not found for PDF export`);
      return res.status(404).json({ error: 'Record not found' });
    }

    console.log(`✅ Found record ${id}, sending to PDF service`);
    const exportService = require('../services/exportService');
    const filename = `OCR_Export_${id}`;
    exportService.generatePDF(record.extractedText || record.extracted_text || '', res, filename);
  } catch (error) {
    console.error('❌ PDF Export error:', error);
    res.status(500).json({ error: 'Error generating PDF' });
  }
};

/**
 * Export OCR record to Excel
 */
exports.exportToExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user?.id || req.user?.userId;
    console.log(`📊 Exporting record ${id} to Excel for user ${userId}`);

    const record = await OcrRecord.findOne(dbType === 'mysql' ? { where: { id, userId } } : { _id: id, userId });

    if (!record) {
      console.error(`❌ Record ${id} not found for Excel export`);
      return res.status(404).json({ error: 'Record not found' });
    }

    console.log(`✅ Found record ${id}, sending to Excel service`);
    const exportService = require('../services/exportService');
    const filename = `OCR_Export_${id}`;
    await exportService.generateExcel(record.extractedText || record.extracted_text || '', res, filename);
  } catch (error) {
    console.error('❌ Excel Export error:', error);
    res.status(500).json({ error: 'Error generating Excel' });
  }
};

/**
 * Delete a specific OCR record
 */
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user?.id || req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized: Missing userId' });

    let deletedCount;
    if (dbType === 'mysql') {
      deletedCount = await OcrRecord.destroy({
        where: { id, userId }
      });
    } else {
      const result = await OcrRecord.deleteOne({ _id: id, userId });
      deletedCount = result.deletedCount;
    }

    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Record not found or not owned by user' });
    }

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting record:', error);
    res.status(500).json({ error: 'Error deleting record' });
  }
};
