import { GoogleGenAI } from "@google/genai";
import { EmotionType } from "../types";

interface GenerateStickerParams {
  imageBase64: string;
  promptSuffix: string;
  stylePrompt: string;
  emotionId: EmotionType;
  emoji: string;
}

interface GenerateStickerResult {
  url: string;
  type: 'video' | 'image';
  source: 'veo' | 'gemini' | 'canvas';
}

// Helper to remove data URL prefix
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

// Helper to get mime type
const getMimeType = (dataUrl: string) => {
  return dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';')) || 'image/png';
};

export const generateSticker = async (params: GenerateStickerParams): Promise<GenerateStickerResult> => {
  const { imageBase64, promptSuffix, stylePrompt, emotionId, emoji } = params;
  
  const apiKey = process.env.API_KEY;
  const imageBytes = cleanBase64(imageBase64);
  const mimeType = getMimeType(imageBase64);

  // If no API key is present, go straight to canvas fallback
  if (!apiKey) {
    console.warn("No API Key found, using canvas fallback.");
    // We treat "manga" style or similar keywords as a trigger for grayscale in canvas
    const isGrayscale = stylePrompt.includes('black and white') || stylePrompt.includes('monochrome');
    return await generateCanvasSticker(imageBase64, emotionId, emoji, isGrayscale);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Tier 1: Try Video Generation (Veo)
  try {
    const fullPrompt = `A cute animated sticker of this character. The character is ${promptSuffix}. ${stylePrompt}. Solid white background. Seamless loopable animation. High quality, expressive.`;

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: fullPrompt,
      image: {
        imageBytes: imageBytes,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '1:1'
      }
    });

    // Poll for completion
    let attempts = 0;
    while (!operation.done && attempts < 30) { // Timeout after ~90s
      await new Promise(resolve => setTimeout(resolve, 3000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      attempts++;
    }

    if (operation.error) {
      throw new Error((operation.error.message as string) || "Video generation failed");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
      throw new Error("No video output returned");
    }

    const videoResponse = await fetch(`${videoUri}&key=${apiKey}`);
    
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    return {
      url: URL.createObjectURL(videoBlob),
      type: 'video',
      source: 'veo'
    };

  } catch (veoError: any) {
    console.warn("Veo generation failed, falling back to static image generation.", veoError);
    
    // Tier 2: Try Static Image Generation (Gemini Flash)
    try {
        return await generateStaticAISticker({ 
            ai, 
            imageBytes, 
            mimeType, 
            promptSuffix, 
            stylePrompt 
        });
    } catch (imageError: any) {
        console.warn("AI Image generation failed, falling back to canvas.", imageError);
        
        // Tier 3: Local Canvas Fallback (Guaranteed Success)
        const isGrayscale = stylePrompt.includes('black and white') || stylePrompt.includes('monochrome');
        return await generateCanvasSticker(imageBase64, emotionId, emoji, isGrayscale);
    }
  }
};

const generateStaticAISticker = async ({
  ai,
  imageBytes,
  mimeType,
  promptSuffix,
  stylePrompt
}: {
  ai: GoogleGenAI,
  imageBytes: string,
  mimeType: string,
  promptSuffix: string,
  stylePrompt: string
}): Promise<GenerateStickerResult> => {
  
  const fullPrompt = `A cute sticker of this character. The character is ${promptSuffix}. ${stylePrompt}. Solid white background. High quality, expressive, vector art style.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBytes
          }
        },
        { text: fullPrompt }
      ]
    }
  });

  let base64Image: string | undefined;
  
  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }
  }

  if (!base64Image) {
    throw new Error("Failed to generate static sticker image");
  }

  const byteCharacters = atob(base64Image);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  return {
    url: URL.createObjectURL(blob),
    type: 'image',
    source: 'gemini'
  };
};

const generateCanvasSticker = async (
  imageBase64: string, 
  emotionId: EmotionType, 
  emoji: string,
  isGrayscale: boolean
): Promise<GenerateStickerResult> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    img.onload = () => {
      // Set canvas size (square)
      const size = 512;
      canvas.width = size;
      canvas.height = size;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw original image (centered and fit)
      const scale = Math.min(size / img.width, size / img.height) * 0.8;
      const x = (size - img.width * scale) / 2;
      const y = (size - img.height * scale) / 2;

      ctx.save();
      
      // Apply Grayscale if needed
      if (isGrayscale) {
        ctx.filter = 'grayscale(100%) contrast(120%)';
      }

      // Apply Emotion transformations
      applyEmotionTransform(ctx, emotionId, size);
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      ctx.restore();

      // Draw Emoji Overlay
      ctx.font = '80px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 10;
      ctx.fillText(emoji, size - 20, size - 20);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            url: URL.createObjectURL(blob),
            type: 'image',
            source: 'canvas'
          });
        } else {
          reject(new Error("Canvas conversion failed"));
        }
      }, 'image/png');
    };

    img.onerror = () => reject(new Error("Failed to load image for canvas"));
    img.src = imageBase64;
  });
};

const applyEmotionTransform = (ctx: CanvasRenderingContext2D, emotionId: EmotionType, size: number) => {
    const center = size / 2;
    ctx.translate(center, center);

    switch (emotionId) {
        case 'angry':
            // Shake + Red Tint
            ctx.rotate((Math.random() - 0.5) * 0.2); 
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(-center, -center, size, size);
            break;
        case 'cry':
            // Blue Tint
            ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
            ctx.fillRect(-center, -center, size, size);
            break;
        case 'love':
            // Pink Tint
            ctx.fillStyle = 'rgba(255, 105, 180, 0.1)';
            ctx.fillRect(-center, -center, size, size);
            break;
        case 'confused':
            // Tilt
            ctx.rotate(0.2);
            break;
        case 'surprised':
            // Zoom in
            ctx.scale(1.2, 1.2);
            break;
        case 'sleepy':
            // Darker
            ctx.fillStyle = 'rgba(0, 0, 50, 0.3)';
            ctx.fillRect(-center, -center, size, size);
            break;
        case 'cool':
            // Cool contrast
            ctx.filter = 'contrast(1.2) saturate(1.2)';
            break;
        case 'shy':
             // Red cheeks tint (simulated)
             ctx.fillStyle = 'rgba(255, 100, 100, 0.1)';
             ctx.fillRect(-center, -center, size, size);
             ctx.scale(0.9, 0.9);
             break;
        case 'rich':
             // Gold tint
             ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
             ctx.fillRect(-center, -center, size, size);
             break;
        default:
            break;
    }
    
    ctx.translate(-center, -center);
};