"use client";

import React, { useEffect } from "react";
import {
  X,
  Download,
  ExternalLink,
  Image as ImageIcon,
  PlayCircle,
  FileText,
  Youtube,
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
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !media) return null;

  const youtubeEmbedUrl = getYouTubeEmbedUrl(media.url);
  const isVideo =
    Boolean(youtubeEmbedUrl) ||
    media.type?.startsWith("video/") ||
    media.url.match(/\.(mp4|webm|mov|ogg)($|\?)/i);
  const isImage =
    !isVideo &&
    (media.type?.startsWith("image/") ||
      Boolean(media.url.match(/\.(jpeg|jpg|png|gif|webp|svg)($|\?)/i)) ||
      media.url.startsWith("data:image/"));

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col rounded-3xl bg-[#0f1017] border border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/70">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
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
              <h3 className="text-sm font-bold text-white truncate max-w-md sm:max-w-xl">
                {media.title || "Visualizador de Mídia"}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                <span className="uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                  {youtubeEmbedUrl
                    ? "Tutorial YouTube"
                    : isVideo
                    ? "Vídeo"
                    : isImage
                    ? "Imagem"
                    : "Arquivo"}
                </span>
                {media.size ? <span>• {formatFileSize(media.size)}</span> : null}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
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
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 bg-zinc-800/60 hover:bg-rose-950/40 border border-zinc-700/60 hover:border-rose-900/50 transition-colors shadow-xs cursor-pointer ml-1"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-black/40 min-h-[300px]">
          {youtubeEmbedUrl ? (
            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-black">
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
              className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl border border-zinc-800/80 bg-black"
            >
              Seu navegador não suporta a reprodução deste vídeo.
            </video>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt={media.title}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-zinc-800/80"
            />
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

