const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('='.repeat(80));
  console.log('파일:', path.basename(filePath));
  console.log('='.repeat(80));

  workbook.eachSheet((sheet, sheetId) => {
    console.log('\n시트:', sheet.name);
    console.log('-'.repeat(40));

    const rowCount = sheet.rowCount;
    const colCount = sheet.columnCount;
    console.log('행 수:', rowCount, '열 수:', colCount);

    sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
      const values = [];
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        let val = cell.value;
        if (val && typeof val === 'object') {
          if (val.result !== undefined) val = val.result;
          else if (val.text) val = val.text;
          else if (val.richText) val = val.richText.map(r => r.text).join('');
        }
        if (val !== null && val !== undefined && val !== '') {
          values.push('[' + colNum + ']' + val);
        }
      });
      if (values.length > 0) {
        console.log('R' + rowNum + ':', values.join(' | '));
      }
    });
  });
}

const files = [
  'planning/1. Sales견적서 나간 날짜(물품 명)_(고객사명)_(해당 담당자)_ERP 예시용 견적서.xlsx',
  'planning/2. Sales품의서 작성 날짜_당일 품의서 작성 순서(물품 명)_(고객사명)_(해당 담당자)_ERP 예시용 품의서.xlsx',
  'planning/3. Sales발주서 작성날짜_물품명_매입처 담당자_ERP예시용 발주서.xlsx',
  'planning/4. MA견적서-견적요청회사(유지보수 제품명)_(견적서 날짜)_ERP 예시용 유지보수 견적서.xlsx',
  'planning/5. D251202_유지보수 품의서_[고객사명]_M_ERP 예시용 유지보수 품의서.xlsx'
];

(async () => {
  for (const file of files) {
    try {
      await analyzeExcel(file);
    } catch (e) {
      console.log('에러:', file, e.message);
    }
  }
})();
