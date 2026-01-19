import React from 'react';
import { Eye, Download, Heart, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import { GeneratedImage } from '../types';

interface ImageGridProps {
  images: GeneratedImage[];
  onPreview?: (img: GeneratedImage) => void;
  onToggleFavorite: (id: string) => void;
  isLoading?: boolean;
  isLargeView?: boolean;
  
  // Multi-select props
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

// Helper to get file extension from data URL
const getFileExtensionFromDataUrl = (dataUrl: string): string => {
  const mimeType = dataUrl.split(';')[0].split(':')[1];
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
  if (mimeType.includes('gif')) return '.gif';
  if (mimeType.includes('webp')) return '.webp';
  return '.png'; // Default to PNG if no specific image MIME type
};

export const ImageGrid: React.FC<ImageGridProps> = ({ 
  images, 
  onPreview, 
  onToggleFavorite, 
  isLoading, 
  isLargeView = false,
  isSelectMode = false,
  selectedIds,
  onSelect
}) => {
  
  const handleDownload = (e: React.MouseEvent, img: GeneratedImage) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = img.url;
    // Use the image ID (timestamp) and determined extension for the filename
    link.download = `${img.id}${getFileExtensionFromDataUrl(img.url)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onToggleFavorite(id);
  };

  const handleCardClick = (img: GeneratedImage) => {
    if (isSelectMode && onSelect) {
      onSelect(img.id);
    } else if (onPreview) {
      onPreview(img);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="aspect-[3/4] bg-app-panel rounded-xl flex items-center justify-center relative overflow-hidden group border border-white/5">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-shimmer"></div>
             <Sparkles className="text-gray-600 opacity-20 animate-ping" size={32} />
          </div>
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
        <div className="w-24 h-24 mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <ImageIcon size={48} className="text-gray-600" />
        </div>
        <p className="font-medium text-base">Chưa có hình ảnh nào</p>
      </div>
    );
  }

  // Grid Layout Logic
  // Using 3:4 aspect ratio for fashion images.
  const gridClasses = isLargeView
    ? images.length === 1 
      ? "grid-cols-1 max-w-2xl mx-auto h-full content-center" 
      : "grid-cols-1 md:grid-cols-2 gap-8"
    : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6";

  return (
    <div className={`grid ${gridClasses} p-4 md:p-8 overflow-y-auto custom-scrollbar h-full pb-32 content-start w-full`}>
      {images.map((img) => {
        const isSelected = selectedIds?.has(img.id);

        return (
          <div 
            key={img.id} 
            onClick={() => handleCardClick(img)}
            className={`
              group relative rounded-xl overflow-hidden bg-app-panel transition-all duration-200 shadow-md cursor-pointer
              ${isLargeView ? 'aspect-auto min-h-[50vh]' : 'aspect-[3/4]'}
              ${isSelected 
                ? 'ring-4 ring-app-accent opacity-100 z-10' 
                : 'border border-white/10 hover:border-app-accent/50 hover:shadow-xl hover:z-20'
              }
              ${isSelectMode && !isSelected ? 'opacity-70 hover:opacity-90' : ''}
            `}
            style={{ zIndex: isSelected ? 30 : undefined }} 
          >
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>

            <img 
              src={img.url} 
              alt="Generated" 
              loading="lazy"
              className={`w-full h-full relative z-0 ${isLargeView ? 'object-contain bg-black/40' : 'object-cover object-top'}`}
            />
            
            {/* Multi-select Checkbox Indicator */}
            {isSelectMode && (
              <div className={`absolute top-3 right-3 z-30 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${isSelected ? 'bg-app-accent border-app-accent text-white scale-110' : 'bg-black/40 backdrop-blur-md border-white/60 text-transparent hover:border-white hover:bg-black/60'}`}>
                <Check size={18} strokeWidth={4} />
              </div>
            )}

            {/* Overlay Actions */}
            {!isSelectMode && (
              <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                <div className="flex justify-between items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                  <button 
                    className="flex-1 bg-white hover:bg-gray-100 text-black py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-lg"
                  >
                    <Eye size={14} /> Xem
                  </button>
                  
                  <button 
                    onClick={(e) => handleDownload(e, img)}
                    className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors border border-white/10 backdrop-blur-sm"
                    title="Tải xuống"
                  >
                    <Download size={14} />
                  </button>
                  
                  <button 
                    onClick={(e) => handleFavorite(e, img.id)}
                    className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center backdrop-blur-sm rounded-lg transition-colors border ${img.isFavorite ? 'bg-red-500 text-white border-red-500' : 'bg-gray-800/80 text-white hover:bg-gray-700 border-white/10'}`}
                    title="Yêu thích"
                  >
                    <Heart size={14} fill={img.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            )}
            
            {/* Selected Overlay Tint */}
            {isSelected && <div className="absolute inset-0 bg-app-accent/20 pointer-events-none z-10" />}
          </div>
        );
      })}
    </div>
  );
};