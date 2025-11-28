import React from 'react';
import { EmotionConfig, StickerState } from '../types';
import { Button } from './Button';

interface StickerCardProps {
  emotion: EmotionConfig;
  state: StickerState;
  onGenerate: () => void;
  disabled: boolean;
}

export const StickerCard: React.FC<StickerCardProps> = ({ emotion, state, onGenerate, disabled }) => {
  const { status, mediaUrl, mediaType, error } = state;

  return (
    <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-2xl" role="img" aria-label={emotion.label}>{emotion.emoji}</span>
        <span className="text-sm font-bold text-slate-600 truncate ml-2 flex-1">{emotion.label}</span>
      </div>

      {/* Content Area */}
      <div className="relative aspect-square rounded-2xl bg-slate-50 overflow-hidden mb-3 group flex items-center justify-center border border-slate-100">
        
        {status === 'idle' && (
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-slate-200 mx-auto mb-2 flex items-center justify-center text-slate-400">
               ?
            </div>
            <p className="text-xs text-slate-400">等待生成</p>
          </div>
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-2"></div>
            <p className="text-xs font-medium text-pink-500 animate-pulse">制作中...</p>
          </div>
        )}

        {status === 'success' && mediaUrl && (
          <>
            {mediaType === 'video' ? (
              <video 
                src={mediaUrl} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                src={mediaUrl} 
                alt={emotion.label}
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Type Indicator */}
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/30 backdrop-blur-md rounded-md text-[10px] text-white font-medium">
                {mediaType === 'video' ? '动图' : '图片'}
            </div>
          </>
        )}

        {status === 'error' && (
            <div className="text-center p-2 w-full">
                <p className="text-red-500 text-xs font-bold mb-2">生成失败</p>
                <p className="text-slate-400 text-[10px] line-clamp-2 break-all">{error || "未知错误"}</p>
            </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto space-y-2">
        {status === 'success' && mediaUrl ? (
          <div className="grid grid-cols-2 gap-2">
            <a 
              href={mediaUrl} 
              download={`mojigen-${emotion.id}.${mediaType === 'video' ? 'mp4' : 'png'}`}
              className="col-span-1 flex items-center justify-center px-1 py-2 bg-pink-100 text-pink-600 rounded-xl text-xs font-bold hover:bg-pink-200 transition-colors"
            >
              下载
            </a>
            <button 
              onClick={onGenerate}
              className="col-span-1 flex items-center justify-center px-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              重试
            </button>
          </div>
        ) : (
          <Button 
            variant={status === 'error' ? 'danger' : 'secondary'} 
            size="sm" 
            className="w-full rounded-xl text-xs"
            onClick={onGenerate}
            disabled={disabled && status !== 'error'}
            isLoading={status === 'loading'}
          >
             {status === 'error' ? '重试' : '生成'}
          </Button>
        )}
      </div>
    </div>
  );
};