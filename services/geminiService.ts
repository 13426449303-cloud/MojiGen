import { GoogleGenAI } from "@google/genai";

interface GenerateStickerParams {
  imageBase64: string;
  promptSuffix: string;
  isGrayscale: boolean;
}

interface GenerateStickerResult {
  url: string;
  type: 'video' | 'image';
}

// Helper to remove data URL prefix
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

// Helper to get mime type
const getMimeType = (dataUrl: string) => {
  return dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
};

export const generateSticker = async ({
  imageBase64,
  promptSuffix,
  isGrayscale
}: GenerateStickerParams): Promise<GenerateStickerResult> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageBytes = cleanBase64(imageBase64);
  const mimeType = getMimeType(imageBase64);

  const stylePrompt = isGrayscale 
    ? "black and white line art style, manga style, high contrast, monochrome, ink drawing" 
    : "vibrant colors, 3d render style, cute cartoon style, bright lighting, soft shadows";

  // Try Video Generation (Veo) first
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
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      console.log('Generating video sticker...', operation.metadata);
    }

    if (operation.error) {
      throw new Error((operation.error.message as string) || "Video generation failed");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
      throw new Error("No video output returned");
    }

    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    return {
      url: URL.createObjectURL(videoBlob),
      type: 'video'
    };

  } catch (error: any) {
    console.warn("Veo generation failed, falling back to static image generation.", error);
    
    // Check if error is related to model availability (404) or permission
    const errorMessage = error.toString();
    if (errorMessage.includes("404") || errorMessage.includes("NOT_FOUND") || errorMessage.includes("PermissionDenied")) {
       // Fallback to static image generation
       return await generateStaticSticker({ ai, imageBytes, mimeType, promptSuffix, stylePrompt });
    }
    
    throw error;
  }
};

const generateStaticSticker = async ({
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

  // Extract image from response
  let base64Image: string | undefined;
  
  // Iterate parts to find image
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

  // Convert base64 to Blob URL
  const byteCharacters = atob(base64Image);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  return {
    url: URL.createObjectURL(blob),
    type: 'image'
  };
};
