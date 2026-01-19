
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ImageGrid } from './components/ImageGrid';
import { ImageViewer } from './components/ImageViewer';
import { AppConfig, GeneratedImage, INITIAL_CONFIG, SidebarTab } from './types';
import { generateImages, getTrendingFashionKeywords } from './services/geminiService';
import { Sparkles, GalleryHorizontal, Star, Settings, Image as ImageIcon, CheckSquare, Trash2, Download, X, Square } from 'lucide-react'; 
import JSZip from 'jszip';

// Helper function to format timestamp as YYYYMMDD-HHMMSS
const formatTimestamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

// Helper: Convert Image URL to File object
const urlToFile = async (url: string, filename: string, mimeType: string): Promise<File> => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeType });
};

interface ApiKeyRequiredModalProps {
  onSelectKey: () => void;
  onClose?: () => void; 
}

const ApiKeyRequiredModal: React.FC<ApiKeyRequiredModalProps> = ({ onSelectKey, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
    <div className="bg-app-panel p-8 rounded-xl shadow-2xl max-w-lg w-full text-center border border-app-accent/50 relative" onClick={e => e.stopPropagation()}>
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors z-10"
          title="Đóng"
        >
          <X size={24} />
        </button>
      )}
      <Sparkles size={48} className="text-app-accent mx-auto mb-4 animate-pulse" />
      <h2 className="text-2xl font-bold text-white mb-3">Yêu cầu API Key</h2>
      <p className="text-app-textMuted mb-6 leading-relaxed">
        Để sử dụng mô hình AI chất lượng cao (như Gemini 3 Pro Image hoặc Imagen 3), bạn cần chọn API Key từ dự án Google Cloud có bật thanh toán.
      </p>
      <button
        onClick={onSelectKey}
        className="w-full py-3 rounded-lg font-bold text-base tracking-wide uppercase transition-all shadow-lg bg-gradient-to-r from-[#F06A55] to-[#d64530] text-white hover:shadow-orange-600/50 transform hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group mb-4"
      >
        <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-[shimmer_2s_infinite]"></div>
        Chọn API Key của bạn
      </button>
      <a 
        href="https://ai.google.dev/gemini-api/docs/billing" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-app-accent hover:underline text-sm font-medium"
      >
        Tìm hiểu thêm về thanh toán
      </a>
    </div>
  </div>
);


const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('model'); 
  
  const [skipNextTabReset, setSkipNextTabReset] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [lastBatchIds, setLastBatchIds] = useState<string[]>([]); 
  const [activeTab, setActiveTab] = useState<'result' | 'library' | 'favorites'>('result');
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  
  const [trendingSuggestions, setTrendingSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  // Multi-select State (Single Source of Truth)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [pendingGenerateCall, setPendingGenerateCall] = useState(false);

  const [showMobileSettings, setShowMobileSettings] = useState(true);

  // Fetch trending suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (activeSidebarTab !== 'model' && activeSidebarTab !== 'moodboard') return;

      setIsLoadingSuggestions(true);
      try {
        const type = activeSidebarTab === 'moodboard' ? 'moodboard' : 'model';
        const suggestions = await getTrendingFashionKeywords(type);
        setTrendingSuggestions(suggestions);
      } catch (error) {
        console.error("Failed to fetch trending suggestions:", error);
        if (activeSidebarTab === 'moodboard') {
            setTrendingSuggestions([
                "Minimalist Grid", "Vintage Scrapbook", "Editorial Spread", "Overlapping Collage",
                "Swiss Style", "Polaroid Layout", "Brutalist Design"
            ]);
        } else {
            setTrendingSuggestions([
                "Khuyên tai vàng", "Vòng cổ ngọc trai", "Cảm xúc rạng rỡ", "Ánh sáng điện ảnh",
                "Chụp cận cảnh", "Túi xách da", "Kính mát thời trang", "Thần thái sang trọng"
            ]);
        }
      } finally {
        setIsLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, [activeSidebarTab]); 

  // Reset selection when changing tabs
  useEffect(() => {
    setIsSelectMode(false);
    setSelectedImageIds(new Set());
  }, [activeTab]);

  const initiateGenerate = async () => {
    if (activeSidebarTab === 'model' && !config.designImage) { alert("Vui lòng tải lên Mẫu thiết kế (Design Input)!"); return; }
    if (activeSidebarTab === 'pattern') {
        if (!config.designImage) { alert("Vui lòng tải lên ảnh trang phục (Target)!"); return; }
        if (!config.textureImage) { alert("Vui lòng tải lên ảnh họa tiết (Texture)!"); return; }
    }
    if (activeSidebarTab === 'inpaint' && !config.designImage) { alert("Vui lòng tải lên ảnh cần sửa (Base Image)!"); return; }

    const hasManualKey = config.apiKey && config.apiKey.trim().length > 0;
    const requiresPaidApiKey = config.aiModel === 'gemini-3-pro-image-preview' || config.aiModel === 'imagen-3.0-generate-001';

    if (requiresPaidApiKey && !hasManualKey && window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      let hasKey = false;
      try { hasKey = await window.aistudio.hasSelectedApiKey(); } catch (e) { console.error(e); }
      
      if (!hasKey) {
        setPendingGenerateCall(true);
        setShowApiKeyModal(true);
        return;
      }
    }
    executeGenerate();
  };

  const executeGenerate = async () => {
    setIsGenerating(true);
    setActiveTab('result');
    setShowMobileSettings(false);
    setPendingGenerateCall(false); 

    try {
      const urls = await generateImages(config, activeSidebarTab);
      const now = new Date();
      const baseTimestamp = formatTimestamp(now);

      const newImages: GeneratedImage[] = urls.map((url, index) => ({
        id: urls.length > 1 ? `${baseTimestamp}_${(index + 1).toString().padStart(2, '0')}` : baseTimestamp,
        url,
        timestamp: now.getTime(),
        isFavorite: false,
        prompt: config.promptText
      }));

      setLastBatchIds(newImages.map(img => img.id));
      setGeneratedImages(prev => [...newImages, ...prev]);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found.") || error.message?.includes("hạn mức sử dụng")) {
        alert(error.message);
        setPendingGenerateCall(true);
        setShowApiKeyModal(true);
      } else {
        alert(error.message || "Đã có lỗi xảy ra");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectApiKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        setShowApiKeyModal(false);
        if (pendingGenerateCall) executeGenerate();
      } catch (e) {
        console.error(e);
        alert("Không thể mở cửa sổ chọn API Key.");
      }
    } else {
      alert("Tính năng này không khả dụng.");
    }
  };


  const toggleFavorite = (id: string) => {
    setGeneratedImages(prev => prev.map(img => 
      img.id === id ? { ...img, isFavorite: !img.isFavorite } : img
    ));
    if (selectedImage && selectedImage.id === id) {
      setSelectedImage(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  // --- Workflow Handlers ---
  const handleSendToPattern = async (img: GeneratedImage) => {
    try {
        const file = await urlToFile(img.url, `generated_${img.id}.png`, 'image/png');
        setSkipNextTabReset(true);
        setActiveSidebarTab('pattern');
        setConfig(prev => ({ ...prev, designImage: file, textureImage: null, designWeight: 2, count: 1 }));
        setSelectedImage(null); setShowMobileSettings(true);
        alert("Đã chuyển ảnh sang Tab 2! Hãy tải thêm ảnh họa tiết.");
    } catch (e) { console.error(e); alert("Không thể tải ảnh này."); }
  };

  const handleSendToInpaint = async (img: GeneratedImage) => {
    try {
        const file = await urlToFile(img.url, `generated_${img.id}.png`, 'image/png');
        setSkipNextTabReset(true);
        setActiveSidebarTab('inpaint');
        setConfig(prev => ({ ...prev, designImage: file, maskImage: null, count: 1, promptText: "" }));
        setSelectedImage(null); setShowMobileSettings(true);
        alert("Đã chuyển ảnh sang Tab 4 (Inpaint)! Hãy vẽ vùng cần sửa.");
    } catch (e) { console.error(e); alert("Không thể tải ảnh này."); }
  };
  
  const handleSendToMoodboard = async (img: GeneratedImage) => {
    try {
        const file = await urlToFile(img.url, `generated_${img.id}.png`, 'image/png');
        setSkipNextTabReset(true); 
        setActiveSidebarTab('moodboard');
        setConfig(prev => ({ ...prev, designImage: file, useMoodboardTemplate: false, moodboardTemplateImage: null, count: 1, promptText: "" }));
        setSelectedImage(null); setShowMobileSettings(true);
        alert("Đã chuyển ảnh sang Tab 3 (Moodboard)!");
    } catch (e) { console.error(e); alert("Không thể tải ảnh này."); }
  };

  // --- Single Image Deletion ---
  const handleDeleteImage = useCallback((id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa ảnh này không?")) {
      setGeneratedImages(prev => prev.filter(img => img.id !== id));
      
      // Also remove from selection if present
      setSelectedImageIds(prev => {
        if (prev.has(id)) {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        }
        return prev;
      });

      // If the deleted image was currently open in viewer, close it
      setSelectedImage(current => (current?.id === id ? null : current));
    }
  }, []);


  // --- BULK ACTIONS LOGIC (Unified) ---

  const handleToggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) setSelectedImageIds(new Set()); // Clear on exit
  };

  const handleSelectImage = (id: string) => {
    const newSet = new Set(selectedImageIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedImageIds(newSet);
  };

  const handleLongPress = (id: string) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedImageIds(new Set([id]));
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    } else {
        handleSelectImage(id);
    }
  };

  const getSelectedItems = () => generatedImages.filter(img => selectedImageIds.has(img.id));

  const handleBulkDelete = () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;

    if (window.confirm(`Bạn có chắc muốn xóa ${selectedItems.length} ảnh đã chọn?`)) {
      try {
          const idsToRemove = new Set(selectedImageIds);
          setGeneratedImages(prev => prev.filter(img => !idsToRemove.has(img.id)));
          // Reset selection state
          setSelectedImageIds(new Set());
          setIsSelectMode(false);
      } catch (error) {
          console.error("Bulk delete failed:", error);
          alert("Lỗi khi xóa ảnh.");
      }
    }
  };

  const handleBulkDownload = async () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;
    
    if (!window.confirm(`Tải xuống ${selectedItems.length} ảnh dưới dạng file ZIP?`)) return;

    try {
      const zip = new JSZip();
      const timestamp = formatTimestamp(new Date());
      const folderName = `Sunfly_AI_${timestamp}`;
      const folder = zip.folder(folderName) || zip;
      
      // Process images for ZIP
      await Promise.all(selectedItems.map(async (img) => {
          try {
            let fileName = `${img.id}.png`;
            let data: Blob | string = "";
            let isBase64 = false;

            if (img.url.startsWith('data:')) {
                // Handle Base64 Data URL
                const parts = img.url.split(',');
                const mimeMatch = parts[0].match(/:(.*?);/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                
                // Determine extension
                if (mimeType.includes('jpeg') || mimeType.includes('jpg')) fileName = `${img.id}.jpg`;
                else if (mimeType.includes('webp')) fileName = `${img.id}.webp`;

                data = parts[1]; // The base64 string
                isBase64 = true;
            } else {
                // Handle remote URL
                const response = await fetch(img.url);
                data = await response.blob();
            }

            folder.file(fileName, data, { base64: isBase64 });
          } catch (err) {
            console.error(`Failed to process image ${img.id} for zip:`, err);
          }
      }));

      // Generate and trigger download
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sunfly_Images_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Reset selection state on success
      setSelectedImageIds(new Set());
      setIsSelectMode(false);
      
    } catch (error) {
      console.error("Error creating zip:", error);
      alert("Có lỗi khi tạo file nén. Vui lòng thử lại.");
    }
  };

  // --- Filtering ---
  const filteredImages = () => {
    switch (activeTab) {
      case 'result':
        if (lastBatchIds.length === 0) return [];
        return generatedImages.filter(img => lastBatchIds.includes(img.id));
      case 'library': return generatedImages;
      case 'favorites': return generatedImages.filter(img => img.isFavorite);
      default: return generatedImages;
    }
  };

  const currentViewImages = filteredImages();
  const allCurrentImagesSelected = currentViewImages.length > 0 && currentViewImages.every(img => selectedImageIds.has(img.id));

  const handleSelectAll = () => {
    if (allCurrentImagesSelected) {
      setSelectedImageIds(new Set());
    } else {
      const newSet = new Set(currentViewImages.map(img => img.id));
      setSelectedImageIds(newSet);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-app-bg text-app-text font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR */}
      <div className={`w-full md:w-auto flex-col h-full z-30 ${showMobileSettings ? 'flex' : 'hidden'} md:flex`}>
        <Sidebar 
          config={config} setConfig={setConfig} onGenerate={initiateGenerate} isGenerating={isGenerating} 
          trendingSuggestions={trendingSuggestions} isLoadingSuggestions={isLoadingSuggestions} 
          activeTab={activeSidebarTab} setActiveTab={setActiveSidebarTab}
          skipNextTabReset={skipNextTabReset} setSkipNextTabReset={setSkipNextTabReset}
        />
      </div>

      {/* RIGHT MAIN CONTENT */}
      <main className={`flex-1 flex flex-col min-w-0 relative h-full ${!showMobileSettings ? 'flex' : 'hidden'} md:flex`}>
        
        {/* Top Header / Toolbar */}
        <div className="h-16 border-b border-app-border bg-app-bg flex items-center justify-between px-4 md:px-6 z-10 shrink-0 shadow-sm">
          
          {/* Tabs */}
          <div className="flex items-center gap-4 md:gap-8 h-full overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('result')} className={`flex items-center gap-2 h-full border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'result' ? 'border-app-accent text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>
              <Sparkles size={18} /> <span className="font-bold text-sm md:text-base">Kết quả</span>
            </button>
            <button onClick={() => setActiveTab('library')} className={`flex items-center gap-2 h-full border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'library' ? 'border-app-accent text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>
              <GalleryHorizontal size={18} /> <span className="font-bold text-sm md:text-base">Thư viện</span>
              <span className="bg-gray-800 text-xs px-2 py-0.5 rounded-full text-gray-400 ml-1">{generatedImages.length}</span>
            </button>
            <button onClick={() => setActiveTab('favorites')} className={`flex items-center gap-2 h-full border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'favorites' ? 'border-app-accent text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>
              <Star size={18} /> <span className="font-bold text-sm md:text-base">Yêu thích</span>
              <span className="bg-gray-800 text-xs px-2 py-0.5 rounded-full text-gray-400 ml-1">{generatedImages.filter(i => i.isFavorite).length}</span>
            </button>
          </div>

          {/* Action Buttons (Bulk Tools) - Visible whenever images exist in current view */}
          {currentViewImages.length > 0 && (
            <div className="flex items-center gap-2 ml-4">
              {!isSelectMode ? (
                <button 
                  onClick={handleToggleSelectMode}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium text-sm transition-all shadow-md active:scale-95"
                >
                  <CheckSquare size={16} className="text-[#F06A55]" />
                  <span className="hidden md:inline">Chọn nhiều</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                  <span className="text-sm text-app-accent font-bold mr-2 hidden md:inline">
                    Đã chọn: {selectedImageIds.size}
                  </span>
                  
                  <button onClick={handleSelectAll} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium text-xs transition-all shadow-md active:scale-95">
                    {allCurrentImagesSelected ? <Square size={16} className="text-gray-400" /> : <CheckSquare size={16} className="text-app-accent" />}
                    <span className="hidden sm:inline">{allCurrentImagesSelected ? "Bỏ chọn" : "Tất cả"}</span>
                  </button>

                  <button 
                    onClick={handleBulkDelete}
                    disabled={selectedImageIds.size === 0}
                    className="p-2 w-10 h-10 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                  
                  <button 
                    onClick={handleBulkDownload}
                    disabled={selectedImageIds.size === 0}
                    className="p-2 w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 border border-blue-500 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                  >
                    <Download size={20} />
                  </button>

                  <button onClick={handleToggleSelectMode} className="p-2 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 ml-1 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-[#0B0F19] pb-20 md:pb-0">
          {/* Loading Overlay */}
          {isGenerating && activeTab === 'result' ? (
             <div className="absolute inset-0 z-20 bg-app-bg/95 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500">
                <div className="relative mb-8">
                  <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <h2 className="text-6xl md:text-7xl font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#F06A55] via-purple-500 to-[#F06A55] animate-gradient-x select-none">
                    SUNFLY AI
                  </h2>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <p className="text-gray-400 text-sm font-medium tracking-wide uppercase animate-pulse">Đang dệt nên ý tưởng...</p>
                </div>
                <style>{`
                  @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                  }
                  .animate-gradient-x {
                    background-size: 200% auto;
                    animation: gradient-x 4s linear infinite;
                  }
                `}</style>
             </div>
          ) : null}

          <ImageGrid 
            images={currentViewImages} 
            onPreview={selectedImageIds.size > 0 ? undefined : setSelectedImage}
            onToggleFavorite={toggleFavorite}
            isLoading={isGenerating && activeTab === 'result' && generatedImages.length === 0}
            isLargeView={activeTab === 'result'}
            
            isSelectMode={isSelectMode}
            selectedIds={selectedImageIds}
            onSelect={handleSelectImage}
            onLongPress={handleLongPress}
            onDelete={handleDeleteImage} // NEW PROP

            onSendToPattern={handleSendToPattern}
            onSendToInpaint={handleSendToInpaint}
            onSendToMoodboard={handleSendToMoodboard}
          />
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-app-panel border-t border-app-border z-40 flex justify-around items-center h-16 safe-area-bottom shadow-2xl">
        <button 
          onClick={() => setShowMobileSettings(true)}
          className={`flex flex-col items-center justify-center w-1/2 h-full gap-1 transition-colors ${showMobileSettings ? 'text-app-accent bg-white/5' : 'text-gray-400'}`}
        >
          <Settings size={20} />
          <span className="text-[10px] font-bold uppercase">Cấu hình</span>
        </button>
        <div className="w-px h-8 bg-gray-700"></div>
        <button 
          onClick={() => setShowMobileSettings(false)}
          className={`flex flex-col items-center justify-center w-1/2 h-full gap-1 transition-colors relative ${!showMobileSettings ? 'text-app-accent bg-white/5' : 'text-gray-400'}`}
        >
          <ImageIcon size={20} />
          <span className="text-[10px] font-bold uppercase">Bộ sưu tập</span>
          {isGenerating && (
            <span className="absolute top-3 right-10 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* MODAL PREVIEW */}
      {selectedImage && (
        <ImageViewer 
          image={selectedImage}
          allImages={currentViewImages} 
          onClose={() => setSelectedImage(null)} 
          onToggleFavorite={toggleFavorite}
          onSelectImage={setSelectedImage}
          onDelete={handleDeleteImage} // NEW PROP
          onSendToPattern={handleSendToPattern}
          onSendToInpaint={handleSendToInpaint}
          onSendToMoodboard={handleSendToMoodboard}
        />
      )}

      {/* API Key Required Modal */}
      {showApiKeyModal && (
        <ApiKeyRequiredModal 
          onSelectKey={handleSelectApiKey} 
          onClose={() => { setShowApiKeyModal(false); setPendingGenerateCall(false); }} 
        />
      )}
    </div>
  );
};

export default App;
