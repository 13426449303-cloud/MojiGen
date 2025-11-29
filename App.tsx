
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { ImageUploader } from './components/ImageUploader';
import { StickerCard } from './components/StickerCard';
import { Button } from './components/Button';
import { ApiKeyModal } from './components/ApiKeyModal';
import { EMOTIONS, INITIAL_STICKER_STATE, DEFAULT_STYLE_PROMPT } from './constants';
import { EmotionType, StickerState } from './types';
import { generateSticker } from './services/geminiService';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [stickerStates, setStickerStates] = useState<Record<EmotionType, StickerState>>(INITIAL_STICKER_STATE);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
        setApiKeySet(true);
      }
    };
    checkApiKey();
  }, []);

  const handleImageSelect = (base64: string) => {
    setSelectedImage(base64);
    // Reset stickers when new image is uploaded
    setStickerStates(INITIAL_STICKER_STATE);
  };

  const updateStickerState = (id: EmotionType, newState: Partial<StickerState>) => {
    setStickerStates(prev => ({
      ...prev,
      [id]: { ...prev[id], ...newState }
    }));
  };

  const generateSingleSticker = async (emotionId: EmotionType) => {
    if (!selectedImage) return;

    updateStickerState(emotionId, { status: 'loading', error: undefined });
    
    const emotionConfig = EMOTIONS.find(e => e.id === emotionId);
    
    if (!emotionConfig) return;

    try {
      const result = await generateSticker({
        imageBase64: selectedImage,
        promptSuffix: emotionConfig.promptSuffix,
        stylePrompt: DEFAULT_STYLE_PROMPT,
        emotionId: emotionId,
        emoji: emotionConfig.emoji
      });
      
      updateStickerState(emotionId, { 
        status: 'success', 
        mediaUrl: result.url,
        mediaType: result.type
      });
    } catch (err: any) {
      console.error("Generation error:", err);
      
      const errorMessage = err?.message || JSON.stringify(err);
      
      // Check for specific API Key related errors (400, 403, or specific text)
      if (
        errorMessage.includes("403") || 
        errorMessage.includes("400") || 
        errorMessage.includes("API_KEY_INVALID") || 
        errorMessage.includes("API key not valid") ||
        errorMessage.includes("billing")
      ) {
        setApiKeySet(false); // Trigger modal to reappear
        updateStickerState(emotionId, { status: 'idle', error: undefined }); // Reset to idle
        // Optionally alert the user, though the modal popping up is a strong signal
        return;
      }

      updateStickerState(emotionId, { 
        status: 'error', 
        error: "生成失败: " + (err.message || "未知错误")
      });
    }
  };

  const handleGenerateAll = async () => {
    if (!selectedImage) return;
    setIsGlobalLoading(true);

    // Filter for stickers that aren't already successful
    const stickersToGenerate = EMOTIONS.filter(e => stickerStates[e.id].status !== 'success');

    // Process in smaller batches to avoid overwhelming the browser/API
    const batchSize = 3;
    for (let i = 0; i < stickersToGenerate.length; i += batchSize) {
        const batch = stickersToGenerate.slice(i, i + batchSize);
        // We run these in parallel but we need to stop if API key is invalid
        const promises = batch.map(emotion => generateSingleSticker(emotion.id));
        await Promise.all(promises);
        
        // If the API key became unset during this batch (due to error handler), stop.
        if (!apiKeySet) {
             setIsGlobalLoading(false);
             return;
        }
    }
    
    setIsGlobalLoading(false);
  };

  const handleResetStickers = () => {
      setStickerStates(INITIAL_STICKER_STATE);
  };

  const handleResetAll = () => {
      setSelectedImage(null);
      setStickerStates(INITIAL_STICKER_STATE);
  };

  const handleDownloadAll = async () => {
    const successfulStickers = EMOTIONS.filter(e => stickerStates[e.id].status === 'success' && stickerStates[e.id].mediaUrl);
    
    if (successfulStickers.length === 0) return;

    setIsZipping(true);
    try {
        const zip = new JSZip();
        const folder = zip.folder("mojigen-stickers");
        
        const fetchPromises = successfulStickers.map(async (emotion) => {
            const state = stickerStates[emotion.id];
            if (!state.mediaUrl) return;
            
            const response = await fetch(state.mediaUrl);
            const blob = await response.blob();
            const ext = state.mediaType === 'video' ? 'mp4' : 'png';
            folder?.file(`${emotion.id}-${emotion.label}.${ext}`, blob);
        });

        await Promise.all(fetchPromises);
        
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = "mojigen-stickers.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Failed to zip files", e);
        alert("打包下载失败，请尝试单个下载");
    } finally {
        setIsZipping(false);
    }
  };

  const successfulCount = Object.values(stickerStates).filter(s => s.status === 'success').length;

  return (
    <div className="min-h-screen pb-20 bg-[#fff0f5]">
      {!apiKeySet && <ApiKeyModal onKeySelected={() => setApiKeySet(true)} />}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-pink-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleResetAll}>
                <div className="w-10 h-10 bg-gradient-to-tr from-pink-400 to-rose-500 rounded-xl flex items-center justify-center text-xl shadow-md">
                    ✨
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-600 hidden sm:block">
                    MojiGen
                </h1>
            </div>
            
            <div className="flex items-center gap-2">
               {selectedImage && (
                    <>
                        <Button 
                            onClick={handleResetAll} 
                            variant="secondary"
                            size="sm"
                            className="hidden sm:flex"
                        >
                            重新开始
                        </Button>
                        <Button 
                            onClick={handleGenerateAll} 
                            disabled={isGlobalLoading || successfulCount === EMOTIONS.length}
                            isLoading={isGlobalLoading}
                            size="sm"
                        >
                            {successfulCount === EMOTIONS.length ? '生成完毕' : '一键生成全部'}
                        </Button>
                        {successfulCount > 0 && (
                            <Button
                                onClick={handleDownloadAll}
                                variant="outline"
                                size="sm"
                                disabled={isZipping}
                            >
                                {isZipping ? '打包中...' : `下载全部 (${successfulCount})`}
                            </Button>
                        )}
                    </>
               )}
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Input Section */}
        <section className="mb-10">
            {!selectedImage ? (
                 <div className="text-center mb-8 animate-fade-in">
                    <h2 className="text-3xl font-bold text-slate-800 mb-3">AI 表情包生成器</h2>
                    <p className="text-slate-500 max-w-lg mx-auto">
                        上传一张人物或宠物的照片，AI 将自动为你生成一套包含12种情绪的专属3D表情包。
                    </p>
                </div>
            ) : null}

            <ImageUploader 
                onImageSelect={handleImageSelect} 
                currentImage={selectedImage} 
            />
        </section>

        {/* Grid Section */}
        {selectedImage && (
            <section className="animate-fade-in">
                <div className="flex items-center justify-between mb-6 px-2">
                    <h3 className="text-xl font-bold text-slate-700">表情包预览</h3>
                    <div className="flex items-center gap-2">
                         <span className="text-sm text-slate-400 font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                            {successfulCount} / {EMOTIONS.length} 完成
                        </span>
                    </div>
                   
                </div>

                <div className="grid grid-cols-3 gap-4 sm:gap-6">
                    {EMOTIONS.map((emotion) => (
                        <StickerCard
                            key={emotion.id}
                            emotion={emotion}
                            state={stickerStates[emotion.id]}
                            onGenerate={() => generateSingleSticker(emotion.id)}
                            disabled={isGlobalLoading}
                        />
                    ))}
                </div>
            </section>
        )}
      </main>
    </div>
  );
};

export default App;
