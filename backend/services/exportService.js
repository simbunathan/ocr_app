const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * Generate PDF from text and stream to response
 */
exports.generatePDF = (text, res, filename) => {
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);

    doc.pipe(res);

    doc.fontSize(12).text(text, {
        align: 'left',
        lineGap: 5
    });

    doc.end();
    console.log(`✅ PDF streaming completed for ${filename}`);
};

/**
 * Generate Excel from text and stream to response
 */
exports.generateExcel = async (text, res, filename) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('OCR Result');

    // Split text by lines
    const lines = text.split('\n');

    lines.forEach((line, index) => {
        // Attempt to split by multiple spaces or tabs if it looks like columns
        if (/\s{2,}/.test(line) || /\t/.test(line)) {
            const columns = line.split(/\s{2,}|\t/).map(c => c.trim());
            worksheet.addRow(columns);
        } else {
            worksheet.addRow([line]);
        }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
    console.log(`✅ Excel streaming completed for ${filename}`);
};
