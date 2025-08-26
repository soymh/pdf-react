import { PDFDocument, rgb, PageSizes } from 'pdf-lib@1.17.1';
import type { ExportLayout } from '../App';

interface Snippet {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pdfId: string;
  pageNumber: number;
}

interface LayoutSnippet {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  rotation?: number;
  zIndex?: number;
}

// Convert canvas image to data URL
const canvasToDataURL = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL('image/png');
};

// Create canvas from image element
const createCanvasFromImage = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  
  ctx.drawImage(img, 0, 0);
  return canvas;
};

// Convert image URL to embedded image data
const getImageData = async (imageUrl: string): Promise<Uint8Array> => {
  try {
    // If it's a data URL, convert it directly
    if (imageUrl.startsWith('data:')) {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
    
    // For other URLs, fetch the image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Error loading image:', error);
    
    // Create a fallback placeholder image
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext('2d')!;
    
    // Draw a simple placeholder
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 200, 150);
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Image not found', 100, 75);
    
    const dataUrl = canvas.toDataURL('image/png');
    const response = await fetch(dataUrl);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
};

// Get page dimensions based on size and orientation
const getPageDimensions = (layout: ExportLayout) => {
  const sizes = {
    A4: PageSizes.A4,
    Letter: PageSizes.Letter,
    Legal: PageSizes.Legal,
    A3: PageSizes.A3
  };
  
  const [width, height] = sizes[layout.pageSize];
  
  return layout.orientation === 'portrait' 
    ? [width, height] 
    : [height, width];
};

// Fast export - automatic layout
export const exportFastPDF = async (
  snippets: Snippet[], 
  spaceName: string
): Promise<void> => {
  try {
    const pdfDoc = await PDFDocument.create();
    const [pageWidth, pageHeight] = PageSizes.A4;
    
    // Calculate how many snippets fit per page
    const snippetsPerRow = 2;
    const snippetsPerPage = 6; // 2x3 grid
    
    const snippetWidth = (pageWidth - 60) / snippetsPerRow; // 30px margins
    const snippetHeight = 120;
    const spacing = 20;
    
    let currentSnippets = [...snippets];
    let pageIndex = 0;
    
    while (currentSnippets.length > 0) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const pageSnippets = currentSnippets.splice(0, snippetsPerPage);
      
      // Add page title
      page.drawText(`${spaceName} - Page ${pageIndex + 1}`, {
        x: 30,
        y: pageHeight - 40,
        size: 16,
        color: rgb(0.2, 0.2, 0.2)
      });
      
      for (let i = 0; i < pageSnippets.length; i++) {
        const snippet = pageSnippets[i];
        const row = Math.floor(i / snippetsPerRow);
        const col = i % snippetsPerRow;
        
        const x = 30 + col * (snippetWidth + spacing);
        const y = pageHeight - 100 - row * (snippetHeight + spacing);
        
        try {
          const imageData = await getImageData(snippet.imageUrl);
          let image;
          
          // Try to embed as PNG first, then as JPEG
          try {
            image = await pdfDoc.embedPng(imageData);
          } catch {
            try {
              image = await pdfDoc.embedJpg(imageData);
            } catch {
              console.warn(`Could not embed image for snippet ${snippet.id}`);
              continue;
            }
          }
          
          const imageDims = image.scale(Math.min(
            snippetWidth / image.width,
            snippetHeight / image.height
          ));
          
          page.drawImage(image, {
            x,
            y: y - imageDims.height,
            width: imageDims.width,
            height: imageDims.height
          });
          
          // Add snippet info
          page.drawText(`Snippet ${i + 1}`, {
            x,
            y: y - imageDims.height - 15,
            size: 8,
            color: rgb(0.4, 0.4, 0.4)
          });
          
        } catch (error) {
          console.error(`Error processing snippet ${snippet.id}:`, error);
        }
      }
      
      pageIndex++;
    }
    
    // Download the PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${spaceName}_fast_export.pdf`;
    link.click();
    
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error generating fast PDF:', error);
    throw error;
  }
};

// Custom export - exact layout positioning
export const exportCustomPDF = async (
  snippets: Snippet[],
  layout: ExportLayout,
  spaceName: string
): Promise<void> => {
  try {
    const pdfDoc = await PDFDocument.create();
    const [pageWidth, pageHeight] = getPageDimensions(layout);
    
    // Group snippets by page
    const pageGroups = new Map<number, LayoutSnippet[]>();
    
    layout.snippets.forEach(snippet => {
      if (!pageGroups.has(snippet.pageIndex)) {
        pageGroups.set(snippet.pageIndex, []);
      }
      pageGroups.get(snippet.pageIndex)!.push(snippet);
    });
    
    // Create pages in order
    const maxPage = Math.max(...Array.from(pageGroups.keys()));
    
    for (let pageIndex = 0; pageIndex <= maxPage; pageIndex++) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const pageSnippets = pageGroups.get(pageIndex) || [];
      
      // Sort by z-index to ensure proper layering
      pageSnippets.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      
      // Add page header
      page.drawText(`${spaceName} - Page ${pageIndex + 1}`, {
        x: 20,
        y: pageHeight - 30,
        size: 12,
        color: rgb(0.3, 0.3, 0.3)
      });
      
      for (const layoutSnippet of pageSnippets) {
        // Find the original snippet
        const originalSnippet = snippets.find(s => s.id === layoutSnippet.id);
        if (!originalSnippet) continue;
        
        try {
          const imageData = await getImageData(originalSnippet.imageUrl);
          let image;
          
          // Try to embed the image
          try {
            image = await pdfDoc.embedPng(imageData);
          } catch {
            try {
              image = await pdfDoc.embedJpg(imageData);
            } catch {
              console.warn(`Could not embed image for snippet ${layoutSnippet.id}`);
              continue;
            }
          }
          
          // Calculate position (PDF coordinate system has origin at bottom-left)
          const x = layoutSnippet.x;
          const y = pageHeight - layoutSnippet.y - layoutSnippet.height;
          
          // Apply rotation if specified
          const rotation = (layoutSnippet.rotation || 0) * (Math.PI / 180);
          
          if (rotation !== 0) {
            // For rotated images, we need to calculate the center point
            const centerX = x + layoutSnippet.width / 2;
            const centerY = y + layoutSnippet.height / 2;
            
            page.drawImage(image, {
              x: x,
              y: y,
              width: layoutSnippet.width,
              height: layoutSnippet.height,
              rotate: { type: 'radians', angle: rotation },
              // Note: PDF-lib rotation is around the bottom-left corner
            });
          } else {
            page.drawImage(image, {
              x: x,
              y: y,
              width: layoutSnippet.width,
              height: layoutSnippet.height
            });
          }
          
        } catch (error) {
          console.error(`Error processing snippet ${layoutSnippet.id}:`, error);
          
          // Draw a placeholder rectangle
          page.drawRectangle({
            x: layoutSnippet.x,
            y: pageHeight - layoutSnippet.y - layoutSnippet.height,
            width: layoutSnippet.width,
            height: layoutSnippet.height,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
            color: rgb(0.95, 0.95, 0.95)
          });
          
          page.drawText('Image Error', {
            x: layoutSnippet.x + 10,
            y: pageHeight - layoutSnippet.y - layoutSnippet.height / 2,
            size: 10,
            color: rgb(0.5, 0.5, 0.5)
          });
        }
      }
    }
    
    // Add metadata
    pdfDoc.setTitle(`${spaceName} - Custom Layout`);
    pdfDoc.setCreator('PDF Workspace - Cyberpunk Edition');
    pdfDoc.setProducer('PDF Workspace v2.1.0');
    pdfDoc.setCreationDate(new Date());
    
    // Download the PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${spaceName}_custom_${layout.orientation}_${layout.pageSize}.pdf`;
    link.click();
    
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error generating custom PDF:', error);
    throw error;
  }
};

// Export utility functions
export const PDFExportUtils = {
  exportFastPDF,
  exportCustomPDF
};

export default PDFExportUtils;