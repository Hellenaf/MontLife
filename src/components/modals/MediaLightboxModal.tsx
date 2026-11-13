"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Download,
  ExternalLink,
  Image as ImageIcon,
  PlayCircle,
  FileText,
  Youtube,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  Move,
} from "lucide-react";

export interface MediaItem {
  url: string;
  title: string;
  type?: string;
  size?: number;
}

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem | null;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube-nocookie.com/embed/${v}?autoplay=1`;
      const pathnameParts = parsed.pathname.split("/");
      const embedIdx = pathnameParts.indexOf("embed");
      if (embedIdx !== -1 && pathnameParts[embedIdx + 1]) {
        return `https://www.youtube-nocookie.com/embed/${pathnameParts[embedIdx + 1]}?autoplay=1`;
      }
    }
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1);
      if (id) return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
    }
  } catch {
    // If not a valid standard URL, fallback
  }
  return null;
}

export function MediaLightboxModal({
  isOpen,
  onClose,
  media,
}: MediaLightboxModalProps) {
  // Zoom & Pan states
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistRef = useRef<number | null>(null);

  // Reset transform when media changes or modal opens
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setIsDragging(false);
    setIsFullscreen(false);
  }, [media?.url, isOpen]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(5, Math.round((prev + 0.25) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(0.5, Math.round((prev - 0.25) * 100) / 100);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const isVideo = Boolean(
    (media && getYouTubeEmbedUrl(media.url)) ||
    media?.type?.startsWith("video/") ||
    media?.url.match(/\.(mp4|webm|mov|ogg)($|\?)/i)
  );

  const isImage = Boolean(
    !isVideo &&
    media &&
    (media.type?.startsWith("image/") ||
      Boolean(media.url.match(/\.(jpeg|jpg|png|gif|webp|svg)($|\?)/i)) ||
      media.url.startsWith("data:image/"))
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
      if (isImage) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === "0" || e.key === "r" || e.key === "R") {
          e.preventDefault();
          handleReset();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isImage, isFullscreen, handleZoomIn, handleZoomOut, handleReset]);

  if (!isOpen || !media) return null;

  const youtubeEmbedUrl = getYouTubeEmbedUrl(media.url);

  const handleDownload = () => {
    try {
      const a = document.createElement("a");
      a.href = media.url;
      a.download = media.title || "anexo-montlife";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Falha ao baixar anexo:", err);
      window.open(media.url, "_blank");
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isImage) return;
    e.preventDefault();
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isImage) return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = Math.max(0.5, Math.min(5, Math.round((prev + delta) * 100) / 100));
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImage || scale <= 1 || e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isImage) return;
    if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      touchStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isImage) return;
    if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - touchDistRef.current) / 120;
      touchDistRef.current = dist;
      setScale((prev) => {
        const next = Math.max(0.5, Math.min(5, Math.round((prev + delta) * 100) / 100));
        if (next <= 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistRef.current = null;
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative flex flex-col rounded-3xl bg-[#0f1017] border border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-all ${
          isFullscreen
            ? "fixed inset-2 sm:inset-4 z-50 w-auto h-auto max-w-none max-h-none"
            : "w-[96vw] sm:w-[92vw] max-w-5xl h-[88dvh] sm:h-[84vh] max-h-[780px] min-h-[280px] sm:min-h-[480px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-zinc-800/80 bg-zinc-900/70 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-indigo-400 shrink-0">
              {youtubeEmbedUrl ? (
                <Youtube className="w-4 h-4 text-rose-500" />
              ) : isVideo ? (
                <PlayCircle className="w-4 h-4 text-purple-400" />
              ) : isImage ? (
                <ImageIcon className="w-4 h-4 text-emerald-400" />
              ) : (
                <FileText className="w-4 h-4 text-zinc-400" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                {media.title || "Visualizador de Mídia"}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                <span className="uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                  {youtubeEmbedUrl
                    ? "Tutorial YouTube"
                    : isVideo
                    ? "Vídeo"
                    : isImage
                    ? `Imagem (${Math.round(scale * 100)}%)`
                    : "Arquivo"}
                </span>
                {media.size ? <span>• {formatFileSize(media.size)}</span> : null}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Header Zoom Controls (for desktop fast access) */}
            {isImage && (
              <div className="hidden md:flex items-center gap-1 bg-zinc-800/70 border border-zinc-700/60 rounded-xl p-0.5 mr-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700/60 disabled:opacity-30 transition-colors"
                  title="Diminuir Zoom (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 text-[11px] font-mono font-bold text-zinc-200 hover:text-white transition-colors"
                  title="Redefinir Zoom para 100%"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={scale >= 5}
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700/60 disabled:opacity-30 transition-colors"
                  title="Aumentar Zoom (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700/60 transition-colors ml-0.5"
                  title="Girar 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Toggle Fullscreen Modal */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition-colors shadow-xs cursor-pointer"
              title={isFullscreen ? "Restaurar tamanho normal" : "Expandir em tela cheia"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Secondary Download Button */}
            {!youtubeEmbedUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition-colors shadow-xs cursor-pointer"
                title="Baixar arquivo no computador"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Open externally if needed */}
            <a
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition-colors shadow-xs"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 bg-zinc-800/60 hover:bg-rose-950/40 border border-zinc-700/60 hover:border-rose-900/50 transition-colors shadow-xs cursor-pointer ml-0.5"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="relative flex-1 w-full h-full overflow-hidden p-2 sm:p-4 flex items-center justify-center bg-black/75 min-h-[220px] sm:min-h-[320px]">
          {youtubeEmbedUrl ? (
            <div className="w-full h-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-black flex items-center justify-center">
              <iframe
                src={youtubeEmbedUrl}
                title={media.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : isVideo ? (
            <video
              src={media.url}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-2xl shadow-2xl border border-zinc-800/80 bg-black object-contain"
            >
              Seu navegador não suporta a reprodução deste vídeo.
            </video>
          ) : isImage ? (
            <div
              className="relative flex items-center justify-center w-full h-full overflow-hidden select-none"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onDoubleClick={handleDoubleClick}
              style={{
                cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
              }}
            >
              {/* Image with dynamic transform and smooth transitions */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media.url}
                alt={media.title}
                draggable={false}
                style={{
                  transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
                  transition: isDragging ? "none" : "transform 140ms ease-out",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  userSelect: "none",
                  pointerEvents: "auto",
                }}
                className="rounded-xl shadow-2xl border border-zinc-800/80 will-change-transform"
              />

              {/* Floating Bottom Zoom & Tool HUD for Images */}
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 shadow-2xl text-xs text-white max-w-[92vw] overflow-x-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Zoom Out Button */}
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Diminuir Zoom (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                {/* Current Zoom Level badge (click to reset) */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors min-w-[54px] text-center cursor-pointer"
                  title="Clique para redefinir para 100%"
                >
                  {Math.round(scale * 100)}%
                </button>

                {/* Zoom In Button */}
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={scale >= 5}
                  className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Aumentar Zoom (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-zinc-700 mx-0.5 shrink-0" />

                {/* Reset / 1:1 Button */}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={scale === 1 && rotation === 0 && position.x === 0 && position.y === 0}
                  className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Redefinir visualização (1:1)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Rotate Button */}
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Girar 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Pan hint when zoomed */}
                {scale > 1 && (
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-indigo-400 pl-1 font-medium">
                    <Move className="w-3 h-3" />
                    <span>Arraste para mover</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-8 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-zinc-500 opacity-60" />
              <p className="text-sm font-medium text-zinc-300">
                Pré-visualização direta não disponível para este formato.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Arquivo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

