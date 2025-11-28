import React, { useState } from 'react';
import { Button } from './Button';

interface ApiKeyModalProps {
  onKeySelected: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySelected }) => {
  const [loading, setLoading] = useState(false);

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (!aiStudio) {
        alert("未检测到 Google GenAI SDK 环境。");
        return;
    }
    setLoading(true);
    try {
        await aiStudio.openSelectKey();
        // Assume success if no error thrown
        onKeySelected();
    } catch (e) {
        console.error(e);
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-bounce-in">
        <div className="w-16 h-16 bg-gradient-to-tr from-pink-400 to-purple-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl shadow-lg shadow-pink-500/30">
          🔑
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">需要 API 密钥</h2>
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
          要使用 Google Veo 生成高质量的动态视频表情包，您需要连接一个已启用计费的 Google Cloud 项目的 API 密钥。
        </p>
        
        <Button onClick={handleSelectKey} className="w-full mb-3" isLoading={loading}>
          选择 API 密钥 (推荐)
        </Button>

        <button 
          onClick={onKeySelected}
          className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors"
        >
          暂不配置，使用基础版 (仅本地生成)
        </button>

        <div className="mt-4 pt-4 border-t border-slate-100">
            <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-pink-500 hover:text-pink-600 hover:underline font-medium"
            >
            了解关于计费和要求的更多信息
            </a>
        </div>
      </div>
    </div>
  );
};