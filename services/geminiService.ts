
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

  // Post-process the AI image to ensure standardized sticker format (white bg, centered)
  const processedImageUrl = await processStickerImage(`data:image/png;base64,${base64Image}`);

  return {
    url: processedImageUrl,
    type: 'image',
    source: 'gemini'
  };
};

// Helper function to load an image and center it on a square white canvas
const processStickerImage = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        if (!ctx) {
            reject(new Error("Canvas not supported"));
            return;
        }

        img.onload = () => {
            const size = 1024; // High resolution
            canvas.width = size;
            canvas.height = size;

            // 1. Fill background (Solid White)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            // 2. Calculate Centered Layout with Padding
            const padding = size * 0.05; // 5% padding
            const availableSize = size - (padding * 2);

            // Maintain aspect ratio
            const imgAspect = img.width / img.height;
            let drawW = availableSize;
            let drawH = drawW / imgAspect;

            if (drawH > availableSize) {
                drawH = availableSize;
                drawW = drawH * imgAspect;
            }

            // Center in the canvas
            const drawX = (size - drawW) / 2;
            const drawY = (size - drawH) / 2;

            // 3. Draw Image
            ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawW, drawH);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(URL.createObjectURL(blob));
                } else {
                    reject(new Error("Failed to process image blob"));
                }
            }, 'image/png');
        };

        img.onerror = () => reject(new Error("Failed to load generated image for post-processing"));
        img.src = imageUrl;
    });
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
      // Set canvas size (square, high res)
      const size = 1024;
      canvas.width = size;
      canvas.height = size;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // --- Layout Logic ---
      const padding = size * 0.05;
      const availableSize = size - (padding * 2);

      const imgAspect = img.width / img.height;
      let drawW = availableSize;
      let drawH = drawW / imgAspect;

      if (drawH > availableSize) {
          drawH = availableSize;
          drawW = drawH * imgAspect;
      }

      const drawX = (size - drawW) / 2;
      const drawY = (size - drawH) / 2;

      ctx.save();
      
      // Apply Grayscale if needed
      if (isGrayscale) {
        ctx.filter = 'grayscale(100%) contrast(120%)';
      }

      // Apply Emotion transformations
      const centerX = drawX + drawW / 2;
      const centerY = drawY + drawH / 2;
      
      ctx.translate(centerX, centerY);
      applyEmotionTransformToContext(ctx, emotionId, size);
      ctx.translate(-centerX, -centerY);
      
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Draw Emoji Overlay (Top Right corner)
      const emojiSize = size * 0.15;
      ctx.font = `${emojiSize}px Arial`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 10;
      ctx.fillText(emoji, size - (padding/2), padding/2);

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

const applyEmotionTransformToContext = (ctx: CanvasRenderingContext2D, emotionId: EmotionType, canvasSize: number) => {
    // Relative to center 0,0
    const size = canvasSize; 
    
    switch (emotionId) {
        case 'angry':
            ctx.rotate((Math.random() - 0.5) * 0.2); 
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.fillRect(-size/2, -size/2, size, size);
            break;
        case 'cry':
            ctx.fillStyle = 'rgba(0, 100, 255, 0.15)';
            ctx.fillRect(-size/2, -size/2, size, size);
            break;
        case 'love':
            ctx.fillStyle = 'rgba(255, 105, 180, 0.1)';
            ctx.fillRect(-size/2, -size/2, size, size);
            break;
        case 'confused':
            ctx.rotate(0.15);
            break;
        case 'surprised':
            ctx.scale(1.1, 1.1);
            break;
        case 'sleepy':
            ctx.fillStyle = 'rgba(0, 0, 80, 0.2)';
            ctx.fillRect(-size/2, -size/2, size, size);
            break;
        case 'cool':
            ctx.filter = 'contrast(1.25) saturate(0.8)';
            break;
        case 'shy':
             ctx.fillStyle = 'rgba(255, 100, 100, 0.1)';
             ctx.fillRect(-size/2, -size/2, size, size);
             ctx.scale(0.95, 0.95);
             break;
        case 'rich':
             ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
             ctx.fillRect(-size/2, -size/2, size, size);
             break;
        default:
            break;
    }
};
