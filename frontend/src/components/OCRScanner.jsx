import { useState } from 'react';
import { ocrAPI } from '../services/api';

const OCRScanner = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [lastRecordId, setLastRecordId] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setExtractedText('');
      setError('');
      setLastRecordId(null);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const { data } = await ocrAPI.processImage(formData);
      setExtractedText(data.text);
      setLastRecordId(data.recordId);
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing image');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type) => {
    if (!lastRecordId) return;
    const token = localStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_URL}/ocr/export/${type}/${lastRecordId}`;

    // Create a temporary link to trigger download with auth token (simple GET with token if backend supports it or use blob)
    // For simplicity, we'll try fetch and blob
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OCR_Export_${lastRecordId}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => console.error('Export error:', err));
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setExtractedText('');
    setError('');
    setLastRecordId(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    console.log(extractedText);
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <h2>📷 OCR Scanner</h2>
        <p className="subtitle">Upload an image to extract text</p>

        <div className="upload-section">
          <input
            type="file"
            id="file-input"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-input" className="btn btn-primary">
            📁 Choose Image
          </label>
          {selectedFile && <span className="file-name">{selectedFile.name}</span>}
        </div>

        {preview && (
          <div className="preview-section">
            <img src={preview} alt="Preview" className="image-preview" />
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="action-buttons">
          <button
            onClick={handleProcess}
            className="btn btn-success"
            disabled={!selectedFile || loading}
          >
            {loading ? '⏳ Processing...' : '🔍 Extract Text'}
          </button>

          {extractedText && (
            <>
              <button
                onClick={() => handleExport('pdf')}
                className="btn btn-pdf"
                style={{ backgroundColor: '#e74c3c', color: 'white' }}
              >
                📄 PDF
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="btn btn-excel"
                style={{ backgroundColor: '#27ae60', color: 'white' }}
              >
                📊 Excel
              </button>
            </>
          )}

          <button onClick={handleClear} className="btn btn-secondary">
            🗑️ Clear
          </button>
        </div>

        {extractedText && (
          <div className="result-section">
            <div className="result-header">
              <h3>Extracted Text:</h3>
              <button onClick={handleCopy} className="btn btn-small">
                📋 Copy
              </button>
            </div>
            <textarea
              className="extracted-text"
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              rows="10"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OCRScanner;