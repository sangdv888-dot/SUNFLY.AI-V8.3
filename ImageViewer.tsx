import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Download, Heart, ChevronLeft, ChevronRight, PenTool, ScanFace, Palette } from 'lucide-react';
import { GeneratedImage } from '../types';

interface ImageViewerProps {
  image: GeneratedImage;
  allImages: GeneratedImage[]; // Danh sách ảnh để điều hướng
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onSelectImage: (img: GeneratedImage) => void; // Hàm chuyển ảnh
  
  // Specific Handlers for new workflow
  onSendToPattern: (img: GeneratedImage) => void;
  onSendToFaceSwap: (img: GeneratedImage) => void;
}

// Helper to get file extension from data URL
const getFileExtensionFromDataUrl = (dataUrl: string): string => {
  const mimeType = dataUrl.split(';')[0].split(':')[1];
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
  if (mimeType.includes('gif')) return '.gif';
  if (mimeType.includes('webp')) return '.webp';
  return '.png'; // Default to PNG if no specific image MIME type
};

export const ImageViewer: React.FC<ImageViewerProps> = ({ 
  image, 
  allImages,
  onClose, 
  onToggleFavorite,
  onSelectImage,
  onSendToPattern,
  onSendToFaceSwap
}) => {
  const imgContainerRef = useRef<HTMLDivElement>(null); // Ref for the div wrapping the image
  const imgRef = useRef<HTMLImageElement>(null); // Ref for the actual image element

  // Zoom/Pan states
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  
  // Drag states (for mouse pan on desktop, single-finger pan on mobile)
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 }); // Mouse or single touch starting point
  const [initialPan, setInitialPan] = useState({ x: 0, y: 0 }); // Initial pan offset when drag starts

  // Pinch states (for two-finger zoom on mobile)
  const [isPinching, setIsPinching] = useState(false);
  const [initialDistance, setInitialDistance] = useState(0); // Initial distance between two touches
  const [initialScale, setInitialScale] = useState(1); // Scale at the moment pinch started
  const [initialMidpoint, setInitialMidpoint] = useState({ x: 0, y: 0 }); // Midpoint of two touches for more accurate zoom center

  // Device detection
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Reset zoom/pan when the viewed image changes
  useEffect(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setIsDragging(false);
    setIsPinching(false);
  }, [image]);

  // Image navigation logic
  const currentIndex = allImages.findIndex(img => img.id === image.id);
  const hasPrev = allImages.length > 1;
  const hasNext = allImages.length > 1;

  const handleNext = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    if (!hasNext) return;
    const nextIndex = (currentIndex + 1) % allImages.length;
    onSelectImage(allImages[nextIndex]);
  }, [currentIndex, allImages, hasNext, onSelectImage]);

  const handlePrev = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    if (!hasPrev) return;
    const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    onSelectImage(allImages[prevIndex]);
  }, [currentIndex, allImages, hasPrev, onSelectImage]);

  // Keyboard navigation (Escape to close, ArrowLeft/Right to navigate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  // Download individual image
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = image.url;
    // Use the image ID (timestamp) and determined extension for the filename
    link.download = `${image.id}${getFileExtensionFromDataUrl(image.url)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle image favorite status
  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(image.id);
  }

  // --- Core Zoom/Pan Logic ---

  // Adjust pan values to prevent showing empty space when zoomed in
  const clampPan = useCallback((currentTranslateX: number, currentTranslateY: number, currentScale: number) => {
    if (!imgRef.current || !imgContainerRef.current || currentScale <= 1) {
      return { x: 0, y: 0 };
    }

    const imgElement = imgRef.current;
    const containerElement = imgContainerRef.current;

    // Get the actual displayed size of the image, considering object-contain.
    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    const aspectRatio = naturalWidth / naturalHeight;

    const containerWidth = containerElement.clientWidth;
    const containerHeight = containerElement.clientHeight;

    let displayedImageWidth = containerWidth;
    let displayedImageHeight = containerHeight;

    // Adjust displayed image dimensions based on object-contain
    if (containerWidth / containerHeight > aspectRatio) {
        displayedImageWidth = containerHeight * aspectRatio;
    } else {
        displayedImageHeight = containerWidth / aspectRatio;
    }

    const scaledWidth = displayedImageWidth * currentScale;
    const scaledHeight = displayedImageHeight * currentScale;

    // Calculate maximum pan distances from the center of the image
    const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);

    let clampedX = Math.max(-maxX, Math.min(maxX, currentTranslateX));
    let clampedY = Math.max(-maxY, Math.min(maxY, currentTranslateY));

    // If scaled dimension is smaller than container, center it
    if (scaledWidth < containerWidth) clampedX = 0;
    if (scaledHeight < containerHeight) clampedY = 0;
    
    return { x: clampedX, y: clampedY };
  }, []);


  // Mouse wheel zoom (Desktop)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault(); // Prevent page scrolling

    if (!imgRef.current || !imgContainerRef.current) return;

    const scaleAmount = -e.deltaY * 0.001; // Sensitivity
    let newScale = Math.max(1, Math.min(5, scale + scaleAmount)); // Clamp scale between 1x and 5x

    if (newScale === scale) return; // No change in scale

    const containerRect = imgContainerRef.current.getBoundingClientRect();
    const imageRect = imgRef.current.getBoundingClientRect(); // Rect of the displayed image (object-contain applies)

    // Calculate zoom point relative to the original (unscaled) image coordinates
    // Adjust for `object-contain` scaling
    const originalImageWidth = imageRect.width / scale;
    const originalImageHeight = imageRect.height / scale;

    const mouseX = e.clientX - imageRect.left;
    const mouseY = e.clientY - imageRect.top;

    const zoomPointX = mouseX / originalImageWidth; // Ratio 0-1
    const zoomPointY = mouseY / originalImageHeight; // Ratio 0-1

    // Calculate new translate to zoom around the mouse position
    let newTranslateX = translateX - (zoomPointX * originalImageWidth * (newScale - scale));
    let newTranslateY = translateY - (zoomPointY * originalImageHeight * (newScale - scale));
    
    // Apply pan clamping
    const { x: clampedX, y: clampedY } = clampPan(newTranslateX, newTranslateY, newScale);

    setScale(newScale);
    setTranslateX(clampedX);
    setTranslateY(clampedY);

  }, [scale, translateX, translateY, clampPan]);

  // Mouse pan (Desktop - left click when zoomed in)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 0 && scale > 1) { // Left click when zoomed in
      e.preventDefault();
      setIsDragging(true);
      setStartPoint({ x: e.clientX, y: e.clientY });
      setInitialPan({ x: translateX, y: translateY });
    }
  }, [scale, translateX, translateY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || scale === 1) return; // Only pan if dragging and zoomed in
    e.preventDefault();

    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;

    let newTranslateX = initialPan.x + dx;
    let newTranslateY = initialPan.y + dy;

    // Apply pan clamping
    const { x: clampedX, y: clampedY } = clampPan(newTranslateX, newTranslateY, scale);

    setTranslateX(clampedX);
    setTranslateY(clampedY);
  }, [isDragging, startPoint, initialPan, scale, clampPan]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Touch pan/pinch (Mobile)
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) { // Single finger pan
      e.preventDefault();
      setIsDragging(true);
      setStartPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setInitialPan({ x: translateX, y: translateY });
    } else if (e.touches.length === 2) { // Two finger pinch
      e.preventDefault();
      setIsPinching(true);
      setIsDragging(false); // Stop single-finger drag if it was active
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setInitialDistance(dist);
      setInitialScale(scale);

      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setInitialMidpoint({x: midX, y: midY});
    }
  }, [scale, translateX, translateY]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isPinching && e.touches.length === 2) { // Pinch-to-zoom and pan
      e.preventDefault();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDist = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const scaleFactor = newDist / initialDistance;
      let newScale = Math.max(1, Math.min(5, initialScale * scaleFactor)); // Clamp scale

      const currentMidX = (touch1.clientX + touch2.clientX) / 2;
      const currentMidY = (touch1.clientY + touch2.clientY) / 2;

      const imageRect = imgRef.current?.getBoundingClientRect();
      if (!imageRect) return;

      const originalImageWidth = imageRect.width / scale;
      const originalImageHeight = imageRect.height / scale;

      const zoomPointX = (initialMidpoint.x - imageRect.left) / originalImageWidth;
      const zoomPointY = (initialMidpoint.y - imageRect.top) / originalImageHeight;
      
      let newTranslateX = translateX + (currentMidX - initialMidpoint.x) - 
                          (zoomPointX * originalImageWidth * (newScale - scale));
      let newTranslateY = translateY + (currentMidY - initialMidpoint.y) - 
                          (zoomPointY * originalImageHeight * (newScale - scale));

      // Apply pan clamping
      const { x: clampedX, y: clampedY } = clampPan(newTranslateX, newTranslateY, newScale);

      setScale(newScale);
      setTranslateX(clampedX);
      setTranslateY(clampedY);
      setInitialMidpoint({x: currentMidX, y: currentMidY}); // Update midpoint for continuous pan while pinching
      setInitialDistance(newDist); // Update initial distance for smoother scaling
      setInitialScale(newScale); // Update initial scale
      
    } else if (isDragging && e.touches.length === 1 && scale > 1) { // Single-finger pan
      e.preventDefault();
      const dx = e.touches[0].clientX - startPoint.x;
      const dy = e.touches[0].clientY - startPoint.y;

      let newTranslateX = initialPan.x + dx;
      let newTranslateY = initialPan.y + dy;

      // Apply pan clamping
      const { x: clampedX, y: clampedY } = clampPan(newTranslateX, newTranslateY, scale);

      setTranslateX(clampedX);
      setTranslateY(clampedY);
    }
  }, [isPinching, isDragging, initialDistance, initialScale, scale, startPoint, initialPan, translateX, translateY, initialMidpoint, clampPan]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) setIsDragging(false);
    if (isPinching) setIsPinching(false);

    // If scale dropped below 1, reset to 1 and center
    if (scale < 1) {
        setScale(1);
        setTranslateX(0);
        setTranslateY(0);
    } else {
        // Re-clamp pan after interaction ends to ensure bounds are respected
        const { x: clampedX, y: clampedY } = clampPan(translateX, translateY, scale);
        setTranslateX(clampedX);
        setTranslateY(clampedY);
    }
  }, [isDragging, isPinching, scale, translateX, translateY, clampPan]);

  // Setup event listeners based on device type
  useEffect(() => {
    const container = imgContainerRef.current;
    if (container) {
      if (!isTouchDevice) { // Desktop event listeners
        container.addEventListener('wheel', handleWheel as EventListener, { passive: false });
        container.addEventListener('mousedown', handleMouseDown as EventListener);
        container.addEventListener('mousemove', handleMouseMove as EventListener);
        container.addEventListener('mouseup', handleMouseUp as EventListener);
        container.addEventListener('mouseleave', handleMouseUp as EventListener); // End drag if mouse leaves container
      } else { // Mobile touch event listeners
        container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: false });
        container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
        container.addEventListener('touchend', handleTouchEnd as EventListener);
        container.addEventListener('touchcancel', handleTouchEnd as EventListener);
      }
    }
    return () => { // Cleanup event listeners
      if (container) {
        if (!isTouchDevice) {
          container.removeEventListener('wheel', handleWheel as EventListener);
          container.removeEventListener('mousedown', handleMouseDown as EventListener);
          container.removeEventListener('mousemove', handleMouseMove as EventListener);
          container.removeEventListener('mouseup', handleMouseUp as EventListener);
          container.removeEventListener('mouseleave', handleMouseUp as EventListener);
        } else {
          container.removeEventListener('touchstart', handleTouchStart as EventListener);
          container.removeEventListener('touchmove', handleTouchMove as EventListener);
          container.removeEventListener('touchend', handleTouchEnd as EventListener);
          container.removeEventListener('touchcancel', handleTouchEnd as EventListener);
        }
      }
    };
  }, [isTouchDevice, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Apply transform styles to the image
  const imageStyle: React.CSSProperties = {
    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
    cursor: scale > 1 && !isTouchDevice ? 'grab' : (isTouchDevice ? 'grab' : 'zoom-in'),
    transition: (isDragging || isPinching) ? 'none' : 'transform 0.1s ease-out', // Smooth release, instant during interaction
    transformOrigin: '0 0', // Crucial for accurate pan/zoom calculations
    willChange: 'transform' // Optimize for animations
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Navigation Buttons (Left) */}
      {hasPrev && (
        <button 
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all z-[60] group"
          aria-label="Previous image"
        >
          <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
        </button>
      )}

      {/* Navigation Buttons (Right) */}
      {hasNext && (
        <button 
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all z-[60] group"
          aria-label="Next image"
        >
          <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex gap-3 z-[60]">
        <span className="flex items-center text-gray-400 text-sm mr-4 bg-black/40 px-3 rounded-full border border-white/10">
          {currentIndex + 1} / {allImages.length}
        </span>
        
        {/* NEW WORKFLOW BUTTONS */}
        <button
          onClick={(e) => { e.stopPropagation(); onSendToPattern(image); }}
          className="px-4 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-transform active:scale-95"
          title="Chuyển sang Tab 2 để phối họa tiết"
        >
           <Palette size={16} /> Phối Họa Tiết (Tab 2)
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSendToFaceSwap(image); }}
          className="px-4 py-3 rounded-full bg-[#F06A55] text-white hover:bg-[#d64530] font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-transform active:scale-95"
          title="Chuyển sang Tab 3 để ghép mặt"
        >
           <ScanFace size={16} /> Ghép Mặt (Tab 3)
        </button>
        
        <div className="w-px h-8 bg-white/10 mx-2"></div>

        <button 
          onClick={handleToggleFav}
          className={`p-3 rounded-full backdrop-blur-md transition-colors border border-white/10 ${image.isFavorite ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'bg-white/5 text-white hover:bg-white/20'}`}
          title="Yêu thích"
          aria-label="Toggle favorite"
        >
          <Heart fill={image.isFavorite ? "currentColor" : "none"} size={20} />
        </button>
        <button 
          onClick={handleDownload}
          className="p-3 rounded-full bg-white/5 text-white hover:bg-white/20 backdrop-blur-md transition-colors border border-white/10"
          title="Tải xuống"
          aria-label="Download image"
        >
          <Download size={20} />
        </button>
        <button 
          onClick={onClose}
          className="p-3 rounded-full bg-white/5 text-white hover:bg-red-500/80 backdrop-blur-md transition-colors border border-white/10"
          title="Đóng (Esc)"
          aria-label="Close viewer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Image Container with ref for gesture handling */}
      <div 
        ref={imgContainerRef}
        className="relative w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden touch-none" // `touch-none` prevents default browser touch actions
      >
        <img 
          ref={imgRef}
          src={image.url} 
          alt="Generated Result" 
          className="max-w-full max-h-full object-contain rounded-sm select-none"
          style={imageStyle}
        />
      </div>
      
      {scale === 1 && ( // Only show hint if not zoomed
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-2 rounded-full text-white/60 text-xs pointer-events-none border border-white/5">
          {isTouchDevice ? 
            'Vuốt 1 ngón để di chuyển, chụm 2 ngón để phóng to/thu nhỏ • Vuốt ngang để chuyển ảnh' : 
            'Con lăn chuột để phóng to/thu nhỏ • Giữ chuột trái để di chuyển (khi đã phóng to) • Phím mũi tên ⬅️ ➡️ để chuyển ảnh'
          }
        </div>
      )}
    </div>
  );
};