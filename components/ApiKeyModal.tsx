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
        alert("Google GenAI SDK environment not detected.");
        return;
    }
    setLoading(true);
    try {
        await aiStudio.openSelectKey();
        // Assume success if no error thrown, as per race condition instruction
        onKeySelected();
    } catch (e) {
        console.error(e);
        // Reset state on failure
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-pink-400 to-purple-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl shadow-lg shadow-pink-500/30">
          🔑
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">API Key Required</h2>
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
          To generate high-quality videos with Google Veo, you need to select a paid API key from a Google Cloud Project with billing enabled.
        </p>
        
        <Button onClick={handleSelectKey} className="w-full mb-4" isLoading={loading}>
          Select API Key
        </Button>

        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-pink-500 hover:text-pink-600 hover:underline font-medium"
        >
          Learn more about billing & requirements
        </a>
      </div>
    </div>
  );
};