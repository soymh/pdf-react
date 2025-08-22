import { toast } from 'sonner@2.0.3';

// Import worker as a module using Vite's special syntax
import UpscaleWorker from '../workers/upscale-worker?worker';

export interface UpscalingOptions {
  model: 'anime_plus' | 'anime_fast' | 'general' | 'general_plus' | 'general_fast';
  backend: 'webgl' | 'webgpu' | 'cpu';
  factor: number;
}

export interface UpscalingProgress {
  progress: number;
  info: string;
  done?: boolean;
  alertmsg?: string;
  output?: ArrayBuffer;
}

export class UpscalingService {
  private worker: Worker | null = null;
  private currentProgressCallback: ((progress: UpscalingProgress) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // Use Vite's worker import which handles bundling correctly
      this.worker = new UpscaleWorker();
      this.worker.onmessage = (e) => {
        if (this.currentProgressCallback) {
          this.currentProgressCallback(e.data);
        }
      };
      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        toast.error('Upscaling worker error: ' + error.message);
      };
    } catch (error) {
      console.error('Failed to initialize upscaling worker:', error);
      toast.error('Failed to initialize AI upscaling. Please check browser compatibility.');
    }
  }

  // Convert image element to ImageData
  private async imageToImageData(img: HTMLImageElement): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const loadHandler = () => {
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };

      if (img.complete) {
        loadHandler();
      } else {
        img.onload = loadHandler;
        img.onerror = () => reject(new Error('Failed to load image'));
      }
    });
  }

  // Convert ImageData to data URL
  private imageDataToDataURL(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    return canvas.toDataURL('image/png');
  }

  // Convert data URL to ImageData for processing
  private async dataURLToImageData(dataURL: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const imageData = await this.imageToImageData(img);
          resolve(imageData);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image from data URL'));
      img.src = dataURL;
    });
  }

  async upscaleImage(
    imageSource: HTMLImageElement | string, // Image element or data URL
    options: UpscalingOptions,
    onProgress?: (progress: UpscalingProgress) => void
  ): Promise<string> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Convert input to ImageData
        let imageData: ImageData;
        if (typeof imageSource === 'string') {
          imageData = await this.dataURLToImageData(imageSource);
        } else {
          imageData = await this.imageToImageData(imageSource);
        }

        this.currentProgressCallback = (progress: UpscalingProgress) => {
          if (onProgress) {
            onProgress(progress);
          }

          if (progress.alertmsg) {
            reject(new Error(progress.alertmsg));
            return;
          }

          if (progress.done && progress.output) {
            // Convert output back to ImageData and then to data URL
            const outputData = new Uint8ClampedArray(progress.output);
            const outputWidth = imageData.width * options.factor;
            const outputHeight = imageData.height * options.factor;
            
            const outputImageData = new ImageData(outputData, outputWidth, outputHeight);
            const resultDataURL = this.imageDataToDataURL(outputImageData);
            
            this.currentProgressCallback = null;
            resolve(resultDataURL);
          }
        };

        // Send data to worker
        // Clone the buffer to avoid transfer issues
        const bufferCopy = imageData.data.slice().buffer;
        if (this.worker) {
          this.worker.postMessage({
            model: options.model,
            backend: options.backend,
            factor: options.factor,
            width: imageData.width,
            height: imageData.height,
            input: bufferCopy
          }, [bufferCopy]);
        } else {
          reject(new Error('Worker not initialized'));
        }

      } catch (error) {
        this.currentProgressCallback = null;
        reject(error);
      }
    });
  }

  // Get available models with descriptions
  static getAvailableModels() {
    return [
      {
        id: 'general_fast' as const,
        name: 'Real-ESRGAN 4x (Fast)',
        description: 'Best for real photos and screenshots. Fast processing.',
        factor: 4
      },
      {
        id: 'general_plus' as const,
        name: 'Real-ESRGAN 4x Plus',
        description: 'High quality for real photos. Slower but better results.',
        factor: 4
      },
      {
        id: 'general' as const,
        name: 'General Purpose',
        description: 'Good balance for mixed content types; Very Fast processing!',
        factor: 4
      },
      {
        id: 'anime_fast' as const,
        name: 'Anime 4x Fast',
        description: 'Optimized for anime and cartoon images. Fast processing.',
        factor: 4
      },
      {
        id: 'anime_plus' as const,
        name: 'Anime 4x Plus',
        description: 'Enhanced anime upscaling with better details.',
        factor: 4
      }
    ];
  }

  static getAvailableBackends() {
    return [
      {
        id: 'webgl' as const,
        name: 'WebGL',
        description: 'Best compatibility. Uses GPU acceleration.'
      },
      {
        id: 'webgpu' as const,
        name: 'WebGPU',
        description: 'Fastest performance on supported browsers.'
      },
      {
        id: 'cpu' as const,
        name: 'CPU',
        description: 'Fallback option. Slower but works everywhere.'
      }
    ];
  }

  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.currentProgressCallback = null;
  }
}

// Global instance
export const upscalingService = new UpscalingService();