import React, { useCallback, useState } from 'react';

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void;
  currentImage: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, currentImage }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative group cursor-pointer transition-all duration-300 ease-in-out border-4 border-dashed rounded-3xl h-64 flex flex-col items-center justify-center overflow-hidden
          ${isDragging ? 'border-pink-500 bg-pink-50 scale-105' : 'border-slate-200 bg-white hover:border-pink-300 hover:bg-slate-50'}
          ${currentImage ? 'border-solid' : ''}
        `}
      >
        <input
          type="file"
          accept="image/*"
          onChange={onInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {currentImage ? (
          <div className="relative w-full h-full">
            <img src={currentImage} alt="Uploaded" className="w-full h-full object-contain p-4" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <p className="text-white font-bold bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">更换图片</p>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 pointer-events-none">
            <div className="w-20 h-20 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-slate-700 font-bold text-lg mb-1">点击上传参考图片</p>
            <p className="text-slate-400 text-sm">支持拖拽上传</p>
          </div>
        )}
      </div>
    </div>
  );
};