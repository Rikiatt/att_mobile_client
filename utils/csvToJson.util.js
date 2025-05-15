const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

/**
 * Chuyển file .csv thành .json, giữ nguyên tiếng Việt có dấu
 * @param {string} csvPath - Đường dẫn tới file .csv (ví dụ: 'banks.csv')
 * @param {string} jsonPath - Đường dẫn lưu file .json sau khi chuyển đổi (ví dụ: 'banks/local-banks.json')
 */
const convertToJson = (csvPath, jsonPath) => {
  try {
    const content = fs.readFileSync(csvPath);
    const utf8Content = iconv.decode(content, 'utf-8');

    const lines = utf8Content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const result = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });

    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log('Chuyển đổi thành công:', jsonPath);
  } catch (err) {
    console.error('Lỗi khi chuyển CSV sang JSON:', err.message);
  }
};

module.exports = { convertToJson };