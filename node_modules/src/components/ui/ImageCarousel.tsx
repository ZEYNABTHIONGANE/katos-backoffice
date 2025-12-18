import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  alt?: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'wide';
  showDots?: boolean;
  showArrows?: boolean;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  alt = '',
  className = '',
  aspectRatio = 'video',
  showDots = true,
  showArrows = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const swipeDistance = touchStartX.current - touchEndX.current;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className={`bg-gray-200 rounded-lg flex items-center justify-center min-h-[200px] ${className}`}>
        <span className="text-gray-500 text-sm sm:text-base">Aucune image</span>
      </div>
    );
  }

  const aspectClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    wide: 'aspect-[21/9] sm:aspect-[21/9] aspect-[16/9]' // More mobile-friendly ratio
  };

  return (
    <div
      ref={carouselRef}
      className={`relative overflow-hidden rounded-lg group touch-pan-y ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main image container */}
      <div className={`${aspectClasses[aspectRatio]} w-full`}>
        <img
          src={images[currentIndex]}
          alt={alt}
          className="w-full h-full object-cover transition-opacity duration-300 select-none"
          draggable={false}
        />
      </div>

      {/* Navigation arrows - Hidden on mobile, visible on hover for desktop */}
      {showArrows && images.length > 1 && isClient && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 sm:p-1.5 rounded-full transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation cursor-pointer"
            aria-label="Image précédente"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 sm:p-1.5 rounded-full transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation cursor-pointer"
            aria-label="Image suivante"
          >
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </>
      )}

      {/* Dots indicator - Responsive sizing */}
      {showDots && images.length > 1 && (
        <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all touch-manipulation cursor-pointer ${
                index === currentIndex
                  ? 'bg-white scale-110'
                  : 'bg-white/60 hover:bg-white/80'
              }`}
              aria-label={`Aller à l'image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image counter - Responsive positioning and sizing */}
      {images.length > 1 && (
        <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-black/50 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Swipe indicator for mobile */}
      {images.length > 1 && (
        <div className="absolute bottom-1 left-1 sm:hidden bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
          👈 Glissez
        </div>
      )}
    </div>
  );
};