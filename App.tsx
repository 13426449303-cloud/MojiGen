import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { StickerCard } from './components/StickerCard';
import { Button } from './components/Button';
import { ApiKeyModal } from './components/ApiKeyModal';
import { EMOTIONS, INITIAL_STICKER_STATE } from './constants';
import { EmotionType, StickerState } from './types';
import { generateSticker } from './services/geminiService';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [stickerStates, setStickerStates] = useState<Record<EmotionType, StickerState>>(INITIAL_STICKER_STATE);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
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
        isGrayscale
      });
      updateStickerState(emotionId, { 
        status: 'success', 
        mediaUrl: result.url,
        mediaType: result.type
      });
    } catch (err: any) {
      updateStickerState(emotionId, { 
        status: 'error', 
        error: err.message || "生成失败" 
      });
    }
  };

  const handleGenerateAll = async () => {
    if (!selectedImage) return;
    setIsGlobalLoading(true);

    // Filter for stickers that aren't already successful
    const stickersToGenerate = EMOTIONS.filter(e => stickerStates[e.id].status !== 'success');

    const promises = stickersToGenerate.map(emotion => generateSingleSticker(emotion.id));
    
    await Promise.allSettled(promises);
    setIsGlobalLoading(false);
  };

  return (
    <div className="min-h-screen pb-20 bg-[#fff0f5]">
      {!apiKeySet && <ApiKeyModal onKeySelected={() => setApiKeySet(true)} />}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-pink-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-tr from-pink-400 to-rose-500 rounded-xl flex items-center justify-center text-xl shadow-md">
                    ✨
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-600">
                    MojiGen 动态表情包
                </h1>
            </div>
            
            <div className="flex items-center gap-4">
               {selectedImage && (
                    <Button 
                        onClick={handleGenerateAll} 
                        disabled={isGlobalLoading}
                        isLoading={isGlobalLoading}
                        size="sm"
                    >
                        一键生成全部
                    </Button>
               )}
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Input Section */}
        <section className="mb-12">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-800 mb-3">将照片变身动态表情包</h2>
                <p className="text-slate-500">上传一张图片，选择风格，自动生成全套表情动画</p>
            </div>

            <ImageUploader 
                onImageSelect={handleImageSelect} 
                currentImage={selectedImage} 
            />

            {/* Style Toggle */}
            {selectedImage && (
                <div className="flex justify-center mb-8 animate-fade-in-up">
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex">
                        <button
                            onClick={() => setIsGrayscale(false)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${!isGrayscale ? 'bg-pink-100 text-pink-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            🌈 彩色 3D
                        </button>
                        <button
                            onClick={() => setIsGrayscale(true)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isGrayscale ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            ✒️ 黑白漫画
                        </button>
                    </div>
                </div>
            )}
        </section>

        {/* Grid Section */}
        {selectedImage && (
            <section className="animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-700">表情包预览</h3>
                    <span className="text-sm text-slate-400 font-medium">
                        {Object.values(stickerStates).filter(s => s.status === 'success').length} / {EMOTIONS.length} 完成
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-6">
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