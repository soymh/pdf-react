import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/build/pdf';

// Initialize the worker as a module worker
let upscaleWorker = new Worker(new URL('./upscaleWorker.js', import.meta.url), { type: 'module' });

async function upscalePdf(pdfData, modelName = 'realx4plus', backend = 'webgl') {
  console.log("PDF Upscale Module: Starting PDF upscaling process...");
  console.log("PDF Upscale Module: Loading PDF document with pdf-lib...");
  const pdfDoc = await PDFDocument.load(pdfData);
  console.log("PDF Upscale Module: PDF loaded with pdf-lib.");

  console.log("PDF Upscale Module: Getting PDF document with pdfjs...");
  const pdfjsDoc = await pdfjs.getDocument({ data: pdfData }).promise;
  const pages = pdfjsDoc.numPages;
  console.log(`PDF Upscale Module: PDF loaded with pdfjs, found ${pages} pages.`);
  const upscaledImagesData = [];

  for (let i = 1; i <= pages; i++) {
    console.log(`PDF Upscale Module: Preparing to upscale page ${i} of ${pages}...`);
    const page = await pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const canvasContext = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    console.log(`PDF Upscale Module: Rendering page ${i} to canvas at scale 2.0 (width: ${canvas.width}, height: ${canvas.height})...`);
    await page.render({ canvasContext, viewport }).promise;
    console.log(`PDF Upscale Module: Page ${i} rendered to canvas.`);

    const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);

    console.log(`PDF Upscale Module: Sending image data for page ${i} to upscale worker...`);
    const upscaledPageData = await new Promise((resolve) => {
      const handleMessage = (event) => {
        if (event.data.done && event.data.output) {
          console.log(`PDF Upscale Module: Upscaling for page ${i} complete. Worker returned upscaled data.`);
          upscaleWorker.removeEventListener('message', handleMessage);
          resolve(new Uint8ClampedArray(event.data.output));
        } else if (event.data.alertmsg) {
          console.error("PDF Upscale Module: Upscaling error from worker:", event.data.alertmsg);
          upscaleWorker.removeEventListener('message', handleMessage);
          resolve(null);
        } else if (event.data.progress) {
          console.log(`PDF Upscale Module: Page ${i} Upscaling Progress: ${event.data.progress.toFixed(2)}% - ${event.data.info}`);
        }
      };
      upscaleWorker.addEventListener('message', handleMessage);
      upscaleWorker.postMessage({
        width: imageData.width,
        height: imageData.height,
        input: imageData.data.buffer,
        model: modelName,
        backend: backend,
        hasAlpha: false,
      }, [imageData.data.buffer]);
    });

    if (upscaledPageData) {
      console.log(`PDF Upscale Module: Page ${i} successfully upscaled. Original dimensions: ${imageData.width}x${imageData.height}, Upscaled (expected): ${imageData.width * 4}x${imageData.height * 4}.`);
      upscaledImagesData.push({
        data: upscaledPageData,
        width: imageData.width * 4,
        height: imageData.height * 4,
      });
    } else {
      console.warn(`PDF Upscale Module: Upscaling failed for page ${i}. Using original rendered image data for this page.`);
      const originalImageBytes = new Uint8Array(imageData.data.buffer);
      upscaledImagesData.push({
        data: originalImageBytes,
        width: imageData.width,
        height: imageData.height,
      });
    }
  }

  console.log(`PDF Upscale Module: Finished upscaling individual pages. Starting to merge ${upscaledImagesData.length} images into a new PDF...`);
  const newPdfDoc = await PDFDocument.create();
  console.log("PDF Upscale Module: New PDF document created.");

  for (const upscaledImage of upscaledImagesData) {
    console.log("PDF Upscale Module: Embedding image into new PDF...");
    let image;
    try {
        image = await newPdfDoc.embedPng(upscaledImage.data);
        console.log("PDF Upscale Module: Image embedded as PNG.");
    } catch (e) {
        console.warn("PDF Upscale Module: Failed to embed PNG, trying JPG:", e);
        image = await newPdfDoc.embedJpg(upscaledImage.data);
        console.log("PDF Upscale Module: Image embedded as JPG.");
    }

    const page = newPdfDoc.addPage();

    const { width: imgWidth, height: imgHeight } = image;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    const imgAspectRatio = imgWidth / imgHeight;
    const pageAspectRatio = pageWidth / pageHeight;

    let finalWidth = pageWidth;
    let finalHeight = pageHeight;

    if (imgAspectRatio > pageAspectRatio) {
      finalHeight = pageWidth / imgAspectRatio;
    } else {
      finalWidth = pageHeight * imgAspectRatio;
    }
    console.log(`PDF Upscale Module: Adding image to page. Image dimensions: ${imgWidth}x${imgHeight}. Page dimensions: ${pageWidth}x${pageHeight}. Final scaled dimensions: ${finalWidth}x${finalHeight}.`);

    page.drawImage(image, {
      x: (pageWidth - finalWidth) / 2,
      y: (pageHeight - finalHeight) / 2,
      width: finalWidth,
      height: finalHeight,
    });
  }

  console.log("PDF Upscale Module: Saving the new upscaled PDF...");
  const newPdfBytes = await newPdfDoc.save();
  console.log("PDF Upscale Module: New upscaled PDF saved. Upscaling process completed successfully.");
  return newPdfBytes;
}

export default upscalePdf;
