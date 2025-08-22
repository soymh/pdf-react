/* eslint-disable no-restricted-globals */
/* eslint-disable no-unused-vars */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';

class Img {
  constructor(width, height, data = null) {
    this.width = width;
    this.height = height;
    this.data = data || new Uint8Array(width * height * 4);
  }

  getImageCrop(
    x, y, sourceImage, x1, y1, x2, y2
  ) {
    for (let j = y1; j < y2; j++) {
      for (let i = x1; i < x2; i++) {
        let index = (y + j - y1) * this.width * 4 + (x + i - x1) * 4;
        let imageIndex = j * sourceImage.width * 4 + i * 4;
        if (imageIndex + 3 < sourceImage.data.length && index + 3 < this.data.length) {
          this.data[index] = sourceImage.data[imageIndex];
          this.data[index + 1] = sourceImage.data[imageIndex + 1];
          this.data[index + 2] = sourceImage.data[imageIndex + 2];
          this.data[index + 3] = sourceImage.data[imageIndex + 3];
        }
      }
    }
  }
}

async function upscaleImageFunction(image, model, alpha = false) {
  const img2tensor = (img) => {
    let imgdata = new ImageData(img.width, img.height);
    imgdata.data.set(img.data);
    let tensor = tf.browser.fromPixels(imgdata).div(255).toFloat().expandDims();
    return tensor;
  };

  const tensor2img = async (tensor) => {
    let [_, height, width, __] = tensor.shape;
    let clipped = tf.tidy(() =>
      tensor
        .reshape([height, width, 3])
        .mul(255)
        .cast("int32")
        .clipByValue(0, 255)
    );
    tensor.dispose();
    console.log("Worker: Before tf.browser.toPixels - clipped tensor shape:", clipped.shape, ", dtype:", clipped.dtype);
    let data = await tf.browser.toPixels(clipped);
    console.log("Worker: After tf.browser.toPixels - data type:", typeof data, ", length:", data.length);
    if (data && data.length > 0) {
        console.log("Worker: First few bytes of pixel data:", data.slice(0, 10));
    } else {
        console.error("Worker: tf.browser.toPixels returned empty or invalid data!");
    }
    clipped.dispose();
    let image = new Img(width, height, data);
    return image;
  };

  const result = tf.tidy(() => {
    const tensor = img2tensor(image);
    let result = model.predict(tensor);
    if (alpha) {
      result = tf.greater(result, 0.5);
    }
    // Dispose the input tensor immediately after prediction
    tensor.dispose(); 
    return result;
  });
  const resultImage = await tensor2img(result);
  tf.dispose(result);
  return resultImage;
}

async function enlargeImageWithFixedInput(model, inputImg, factor = 4, input_size = 64, min_lap = 12) {
  console.log("Worker: Starting enlargeImageWithFixedInput function.");
  const width = inputImg.width;
  const height = inputImg.height;
  const output = new Img(width * factor, height * factor);
  let num_x = 1;
  for (; (input_size * num_x - width) / (num_x - 1) < min_lap; num_x++);
  let num_y = 1;
  for (; (input_size * num_y - height) / (num_y - 1) < min_lap; num_y++);
  console.log(`Worker: Image dimensions: ${width}x${height}. Number of tiles: ${num_x}x${num_y}.`);

  const locs_x = new Array(num_x);
  const locs_y = new Array(num_y);
  const pad_left = new Array(num_x);
  const pad_top = new Array(num_y);
  const pad_right = new Array(num_x);
  const pad_bottom = new Array(num_y);
  const total_lap_x = input_size * num_x - width;
  const total_lap_y = input_size * num_y - height;
  const base_lap_x = Math.floor(total_lap_x / (num_x - 1));
  const base_lap_y = Math.floor(total_lap_y / (num_y - 1));
  const extra_lap_x = total_lap_x - base_lap_x * (num_x - 1);
  const extra_lap_y = total_lap_y - base_lap_y * (num_y - 1);
  locs_x[0] = 0;
  for (let i = 1; i < num_x; i++) {
    if (i <= extra_lap_x) {
      locs_x[i] = locs_x[i - 1] + input_size - base_lap_x - 1;
    } else {
      locs_x[i] = locs_x[i - 1] + input_size - base_lap_x;
    }
  }
  locs_y[0] = 0;
  for (let i = 1; i < num_y; i++) {
    if (i <= extra_lap_y) {
      locs_y[i] = locs_y[i - 1] + input_size - base_lap_y - 1;
    } else {
      locs_y[i] = locs_y[i - 1] + input_size - base_lap_y;
    }
  }
  pad_left[0] = 0;
  pad_top[0] = 0;
  pad_right[num_x - 1] = 0;
  pad_bottom[num_y - 1] = 0;
  for (let i = 1; i < num_x; i++) {
    pad_left[i] = Math.floor((locs_x[i - 1] + input_size - locs_x[i]) / 2);
  }
  for (let i = 1; i < num_y; i++) {
    pad_top[i] = Math.floor((locs_y[i - 1] + input_size - locs_y[i]) / 2);
  }
  for (let i = 0; i < num_x - 1; i++) {
    pad_right[i] = locs_x[i] + input_size - locs_x[i + 1] - pad_left[i + 1];
  }
  for (let i = 0; i < num_y - 1; i++) {
    pad_bottom[i] = locs_y[i] + input_size - locs_y[i + 1] - pad_top[i + 1];
  }
  const total = num_x * num_y;
  let current = 0;
  let useModel = new Array(total).fill(false);
  if (inputImg.hasAlpha) { 
    // Alpha channel handling (skipped for now as PDF doesn't have it)
  } else {
    for (let i = 0; i < num_x; i++) {
      for (let j = 0; j < num_y; j++) {
        const x1 = locs_x[i];
        const y1 = locs_y[j];
        const x2 = locs_x[i] + input_size;
        const y2 = locs_y[j] + input_size;
        console.log(`Worker: Processing tile ${current + 1}/${total} (${i},${j})...`);
        const tile = new Img(input_size, input_size);
        tile.getImageCrop(0, 0, inputImg, x1, y1, x2, y2);
        console.log(`Worker: Upscaling tile (${i},${j})...`);
        let scaled = await upscaleImageFunction(tile, model);
        console.log(`Worker: Applying upscaled tile (${i},${j}) to output image.`);
        output.getImageCrop(
          (x1 + pad_left[i]) * factor,
          (y1 + pad_top[j]) * factor,
          scaled,
          pad_left[i] * factor,
          pad_top[j] * factor,
          scaled.width - pad_right[i] * factor,
          scaled.height - pad_bottom[j] * factor
        );
        current++;
        postMessage({ progress: (current / total) * 100, info: `Processing ${((current / total) * 100).toFixed(2)}%` });
      }
    }
  }
  console.log("Worker: Finished enlargeImageWithFixedInput function.");
  return output;
}

addEventListener('message', async (e) => {
  const data = e.data;
  console.log("Worker: Message received.", data);

  let model_url = "";
  let input_size = 0;
  if (data?.model === "anime_fast") {
    model_url = `../public/models/anime_fast-64/model.json`;
  }
  if (data?.model === "anime_plus") {
    model_url = `../public/models/anime_plus-64/model.json`;
  }
  if (data?.model === "general") {
    model_url = `../public/models/general/model.json`;
  }
  if (data?.model === "general_plus") {
    model_url = `../public/models/general_plus-64/model.json`;
  }
  if (data?.model === "general_fast") {
    model_url = `../public/models/general_fast-64/model.json`;
  }

  console.log(`Worker: Attempting to set backend to ${data?.backend || "webgl"}...`);
  if (!(await tf.setBackend(data?.backend || "webgl"))) {
    postMessage({ alertmsg: `${data?.backend} is not supported in your browser.` });
    console.error(`Worker: Backend ${data?.backend || "webgl"} is not supported.`);
    return;
  }
  console.log(`Worker: Backend set to ${tf.getBackend()}.`);

  let model;
  try {
    console.log(`Worker: Attempting to load model from IndexedDB: indexeddb://${data?.model}`);
    model = await tf.loadGraphModel(`indexeddb://${data?.model}`);
    console.log("Worker: Model loaded successfully from cache.");
  } catch (error) {
    console.warn(`Worker: Model not found in IndexedDB or error loading: ${error.message}. Attempting to download from ${model_url}.`);
    postMessage({ info: "Downloading model..." });
    try {
      model = await tf.loadGraphModel(model_url);
      await model.save(`indexeddb://${data?.model}`);
      console.log("Worker: Model downloaded and saved to cache.");
    } catch (downloadError) {
      console.error(`Worker: Failed to load or download model: ${downloadError.message}`);
      postMessage({ alertmsg: `Failed to load or download model: ${downloadError.message}` });
      return;
    }
  }

  if (!model) {
    console.error("Worker: Model could not be loaded after all attempts.");
    postMessage({ alertmsg: "Model could not be loaded." });
    return;
  }
  console.log("Worker: Model is ready for prediction.");

  const input = new Img(data.width, data.height, new Uint8ClampedArray(data.input));
  console.log(`Worker: Input image created with dimensions: ${input.width}x${input.height}.`);
  
  let factor = data?.factor || 4;
  const start = Date.now();
  let output;
  try {
    output = await enlargeImageWithFixedInput(model, input, factor);
  } catch (e) {
    console.error("Worker: Error during image enlargement:", e);
    postMessage({ alertmsg: e.toString() });
    return; 
  }
  const end = Date.now();
  console.log("Worker: Upscaling Time:", end - start, "ms");

  await new Promise((resolve) => setTimeout(resolve, 10)); 

  postMessage({
    progress: 100,
    info: `Processing image...`
  });
  
  console.log("Worker: Sending final upscaled image data back to main thread.");
  // Create a new Uint8ClampedArray from output.data, then get its buffer for transfer.
  // This ensures a complete, independent copy for safe transfer.
  const finalUpscaledPixels = new Uint8ClampedArray(output.data);
  const outputBufferToTransfer = finalUpscaledPixels.buffer;

  postMessage(
    {
      progress: 100,
      done: true,
      output: outputBufferToTransfer, // Transfer the buffer of the new Uint8ClampedArray
      info: `Upscaling complete!`
    },
    [outputBufferToTransfer] // Mark this new buffer as transferable
  );
});