/**
 * HTML → PDF 转换脚本
 * 用法: node scripts/html-to-pdf.js <input.html> [output.pdf]
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function main() {
  const input = process.argv[2];
  if (!input) { console.error('Usage: node html-to-pdf.js <input.html> [output.pdf]'); process.exit(1); }

  const output = process.argv[3] || input.replace(/\.html?$/, '.pdf');
  const absPath = path.resolve(input);

  console.log(`Converting: ${absPath}`);
  console.log(`Output: ${output}`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(`file://${absPath}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for ECharts to render
  await new Promise(r => setTimeout(r, 2000));

  await page.pdf({
    path: output,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
  });

  await browser.close();
  console.log(`Done: ${output} (${(fs.statSync(output).size / 1024).toFixed(0)} KB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
