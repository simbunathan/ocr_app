import { useState, useEffect } from 'react';
import { ocrAPI } from '../services/api';

const History = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actrec, setActrec] = useState({});

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await ocrAPI.getHistory();
      setRecords(data.records);
      setActrec(data.records);
    } catch (err) {
      setError('Error fetching history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      await ocrAPI.deleteRecord(id);
      setRecords(records.filter(record => record.id !== id));
    } catch (err) {
      alert('Error deleting record');
    }
  };

  const handleCopy = (id) => {
    const selectedRecord = actrec.find(record => record.id === id);
    if (!selectedRecord || !selectedRecord.extractedText) {
      console.warn("No text found for this record.");
      return;
    }

    const textToCopy = selectedRecord.extractedText;

    // Try the modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      // Must be triggered by a click event — not async render
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          console.log("Copied to clipboard!");
          // alert("Text copied to clipboard!");
        })
        .catch((err) => {
          console.error("Clipboard API failed, using fallback:", err);
          fallbackCopyText(textToCopy);
        });
    } else {
      // Non-HTTPS or non-focused fallback
      fallbackCopyText(textToCopy);
    }
  };

  // Fallback function using a hidden textarea
  const fallbackCopyText = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      console.log(successful ? "Fallback copy successful" : "Fallback copy failed");
      // alert("Text copied!");
    } catch (err) {
      console.error("Fallback copy error:", err);
    }

    document.body.removeChild(textArea);
  };

  const handleExport = (id, type) => {
    const token = localStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_URL}/ocr/export/${type}/${id}`;

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OCR_Export_${id}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => console.error('Export error:', err));
  };

  if (loading) {
    return <div className="loading">Loading history...</div>;
  }

  return (
    <div className="history-container">
      <h2>📚 OCR History</h2>
      {error && <div className="error-message">{error}</div>}

      {records.length === 0 ? (
        <div className="empty-state">
          <p>No records yet. Start scanning images!</p>
        </div>
      ) : (
        <div className="records-grid">
          {records.map((record) => (
            <div key={record.id} className="record-card">
              <div className="record-header">
                <span className="record-date">
                  {new Date(record.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="btn-delete"
                >
                  🗑️
                </button>
              </div>
              <div className="record-text">
                {record?.extractedText?.substring(0, 200) || record?.extracted_text?.substring(0, 200)}
                {(record?.extractedText?.length > 200 || record?.extracted_text?.length > 200) && '...'}
              </div>
              <div className="record-actions" style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                <button
                  onClick={() => handleCopy(record.id)}
                  className="btn btn-small"
                  style={{ flex: 1 }}
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => handleExport(record.id, 'pdf')}
                  className="btn btn-small"
                  style={{ backgroundColor: '#e74c3c', color: 'white', flex: 1 }}
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handleExport(record.id, 'excel')}
                  className="btn btn-small"
                  style={{ backgroundColor: '#27ae60', color: 'white', flex: 1 }}
                >
                  📊 Excel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;