import { useState, useEffect } from "react";
import * as ort from "onnxruntime-web";

export function useYolo(modelPath: string = "/models/yolov8n-cls.onnx") {
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // First, check if the model file exists
        const response = await fetch(modelPath, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Model file not found at ${modelPath}`);
        }

        const s = await ort.InferenceSession.create(modelPath, {
          executionProviders: ["wasm"], // or "webgpu"
        });
        setSession(s);
        setError(null);
      } catch (err: any) {
        // Log detailed error for debugging
        const errorMessage = err?.message || 'Failed to load model';
        console.warn('[useYolo] Failed to load ONNX model:', errorMessage);
        console.warn('[useYolo] Error details:', {
          code: err?.code,
          message: err?.message,
          path: modelPath,
          suggestion: 'The model file may be missing, corrupted, or incompatible. The app will continue without AI model features.'
        });
        setError(errorMessage);
        setSession(null);
      }
    };
    load();
  }, [modelPath]);

  function preprocessImage(imageData: ImageData) {
    const targetSize = 224;

    // Create a canvas to resize the image
    const resizeCanvas = document.createElement("canvas");
    resizeCanvas.width = targetSize;
    resizeCanvas.height = targetSize;

    const resizeCtx = resizeCanvas.getContext("2d")!;
    resizeCtx.drawImage(
        imageDataToCanvas(imageData),
        0,
        0,
        targetSize,
        targetSize
    );

    // Get the resized image
    const resized = resizeCtx.getImageData(0, 0, targetSize, targetSize);

    // Convert to Float32Array in CHW format (3, 224, 224)
    const floatData = new Float32Array(3 * targetSize * targetSize);

    let i = 0;
    for (let y = 0; y < targetSize; y++) {
        for (let x = 0; x < targetSize; x++) {
        const idx = (y * targetSize + x) * 4;
        const r = resized.data[idx] / 255;
        const g = resized.data[idx + 1] / 255;
        const b = resized.data[idx + 2] / 255;

        // CHW format:
        floatData[i] = r; // channel 0
        floatData[i + targetSize * targetSize] = g; // channel 1
        floatData[i + 2 * targetSize * targetSize] = b; // channel 2

        i++;
        }
    }

    return new ort.Tensor("float32", floatData, [1, 3, targetSize, targetSize]);
    }

// Convert original ImageData into a canvas
    function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext("2d")!;
        ctx.putImageData(imageData, 0, 0);
        return canvas;
        }


  const runModel = async (imageData: ImageData) => {
    if (!session) return null;

    // Preprocess image
    const inputTensor = preprocessImage(imageData);

    const outputs = await session.run({ images: inputTensor });
    return outputs;
  };

  return { session, runModel, error };
}

// Basic preprocessing (adjust to your YOLO version)
function preprocessImage(imageData: ImageData) {
  const { data, width, height } = imageData;

  const floatData = new Float32Array(width * height * 3);
  let j = 0;

  for (let i = 0; i < data.length; i += 4) {
    floatData[j++] = data[i] / 255;     // R
    floatData[j++] = data[i + 1] / 255; // G
    floatData[j++] = data[i + 2] / 255; // B
  }

  return new ort.Tensor("float32", floatData, [1, 3, height, width]);
}
