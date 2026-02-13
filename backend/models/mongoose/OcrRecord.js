const mongoose = require('mongoose');

const ocrRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    imagePath: {
        type: String,
        required: true
    },
    extractedText: {
        type: String,
        default: ''
    },
    confidence: {
        type: Number,
        default: 0
    },
    language: {
        type: String,
        default: 'eng'
    },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    }
}, {
    timestamps: true,
    collection: 'ocr_records'
});

const OcrRecord = mongoose.model('OcrRecord', ocrRecordSchema);
module.exports = OcrRecord;
