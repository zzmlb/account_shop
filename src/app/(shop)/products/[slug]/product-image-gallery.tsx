"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { BLUR_DATA_URL } from "@/lib/constants";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  categoryName: string;
  discountPercent?: number;
}

export function ProductImageGallery({
  images,
  productName,
  categoryName,
  discountPercent,
}: ProductImageGalleryProps) {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [mainImgError, setMainImgError] = useState(false);
  const [thumbErrors, setThumbErrors] = useState<Set<number>>(new Set());
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const currentImage = (!mainImgError && images[selectedImageIdx]) || null;

  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        ref={imageContainerRef}
        className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] cursor-zoom-in touch-pan-y"
        onMouseEnter={() => currentImage && setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleImageMouseMove}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (images.length <= 1) return;
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) {
            setMainImgError(false);
            if (diff > 0) {
              setSelectedImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
            } else {
              setSelectedImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
            }
          }
        }}
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt={`${productName} - ${selectedImageIdx + 1}`}
            fill
            className={`object-cover transition-transform duration-200 ${
              isZoomed ? "scale-[2]" : ""
            }`}
            style={
              isZoomed
                ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                : undefined
            }
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            onError={() => setMainImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 via-[var(--accent)]/10 to-[var(--primary)]/5">
            <div className="text-center">
              <div className="text-7xl font-bold text-[var(--primary)]/20">
                {productName.charAt(0)}
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {categoryName}
              </p>
            </div>
          </div>
        )}
        {discountPercent != null && discountPercent > 0 && (
          <div className="absolute right-4 top-4 rounded-[var(--radius-sm)] bg-[var(--destructive)] px-2 py-1 text-sm font-bold text-[var(--destructive-foreground)]">
            -{discountPercent}%
          </div>
        )}
        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-3 rounded-[var(--radius-sm)] bg-black/60 px-2 py-1 text-xs font-medium text-white">
            {selectedImageIdx + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="listbox"
          aria-label="商品图片选择"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              setMainImgError(false);
              setSelectedImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
            } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              setMainImgError(false);
              setSelectedImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
            }
          }}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              role="option"
              aria-selected={idx === selectedImageIdx}
              aria-label={`查看第 ${idx + 1} 张图片`}
              onClick={() => { setSelectedImageIdx(idx); setMainImgError(false); }}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[var(--radius-md)] border-2 transition-all ${
                idx === selectedImageIdx
                  ? "border-[var(--primary)] ring-1 ring-[var(--primary)]/30"
                  : "border-[var(--border)] hover:border-[var(--primary)]/50"
              }`}
            >
              {thumbErrors.has(idx) ? (
                <div className="flex h-full w-full items-center justify-center bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
                  {idx + 1}
                </div>
              ) : (
                <Image
                  src={img}
                  alt={`${productName} 缩略图 ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  onError={() => setThumbErrors((prev) => new Set(prev).add(idx))}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
