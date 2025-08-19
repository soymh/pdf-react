// src/upscaleImage.js

let upscaleWorker = new Worker(new URL('./upscaleWorker.js', import.meta.url), { type: 'module' });

async function upscaleImage(imageData, modelName = 'realx4v3-fast', backend = 'webgpu', onProgress = () => {}) { // Add onProgress callback
  console.log("Image Upscale Module: Received imageData for upscaling with dimensions:", imageData.width, "x", imageData.height);
  console.log("Image Upscale Module: Sending image data to upscale worker...");

  const upscaledImageData = await new Promise((resolve, reject) => {
    const handleWorkerMessage = (event) => {
      if (event.data.done && event.data.output) {
        console.log("Image Upscale Module: Upscaling complete. Worker returned upscaled data.");
        if (event.data.output instanceof ArrayBuffer) {
          console.log("Image Upscale Module: Worker output is ArrayBuffer of size:", event.data.output.byteLength);
        } else {
          console.warn("Image Upscale Module: Worker output is not ArrayBuffer.", typeof event.data.output);
        }
        upscaleWorker.removeEventListener('message', handleWorkerMessage);
        resolve(new Uint8ClampedArray(event.data.output));
      } else if (event.data.alertmsg) {
        console.error("Image Upscale Module: Upscaling error from worker:", event.data.alertmsg);
        upscaleWorker.removeEventListener('message', handleWorkerMessage);
        reject(new Error(event.data.alertmsg)); // Reject the promise on error
      } else if (event.data.progress) {
        console.log(`Image Upscale Module: Upscaling Progress: ${event.data.progress.toFixed(2)}% - ${event.data.info}`);
        onProgress({ detail: { progress: event.data.progress, info: event.data.info } }); // Call the progress callback
      }
    };
    upscaleWorker.addEventListener('message', handleWorkerMessage);
    upscaleWorker.postMessage({
      width: imageData.width,
      height: imageData.height,
      input: imageData.data.buffer,
      model: modelName,
      backend: backend,
      hasAlpha: false, // Assuming general image data from canvas has no alpha for model processing
    }, [imageData.data.buffer]);
  });

  console.log("Image Upscale Module: Received upscaledImageData from worker. Type:", typeof upscaledImageData, ", length:", upscaledImageData.length);
  if (upscaledImageData && upscaledImageData.length > 0) {
    console.log("Image Upscale Module: First few bytes of upscaled image data:", upscaledImageData.slice(0, 10));
  } else {
    console.error("Image Upscale Module: upscaledImageData is empty or invalid!");
  }

  return {
    data: upscaledImageData,
    width: imageData.width * 4, // Assuming 4x upscale from the worker logic
    height: imageData.height * 4,
  };
}

export default upscaleImage;