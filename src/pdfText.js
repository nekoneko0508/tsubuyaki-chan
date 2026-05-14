import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function extractFromBytes(bytes) {
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');
    pages.push(text);
  }

  return pages.join('\n\n').replace(/\s+/g, ' ').trim();
}

export async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  return extractFromBytes(new Uint8Array(buffer));
}

export async function extractPdfTextFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('PDFを取得できませんでした。');
  }

  const buffer = await response.arrayBuffer();
  return extractFromBytes(new Uint8Array(buffer));
}
