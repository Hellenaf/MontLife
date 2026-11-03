"use client";

import React, { useState, useRef } from "react";
import {
  Paperclip,
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  FileText,
  Image as ImageIcon,
  Plus,
  Globe,
  Loader2,
} from "lucide-react";
import { TaskAttachment } from "@/types";
import { processFileToAttachment, formatFileSize } from "@/lib/attachmentUtils";

interface AttachmentManagerProps {
  attachments: TaskAttachment[];
  onChange: (attachments: TaskAttachment[]) => void;
  stage?: "creation" | "resolution";
  readOnly?: boolean;
  label?: string;
}

export function AttachmentManager({
  attachments,
  onChange,
  stage = "creation",
  readOnly = false,
  label,
}: AttachmentManagerProps) {
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFile(true);
    try {
      const newAtts: TaskAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const att = await processFileToAttachment(file, stage);
        newAtts.push(att);
      }
      onChange([...attachments, ...newAtts]);
    } catch (err) {
      console.error("Erro ao processar arquivo:", err);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddLink = () => {
    let cleanUrl = linkUrl.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    let parsedDomain = cleanUrl;
    try {
      const parsed = new URL(cleanUrl);
      parsedDomain = parsed.hostname.replace(/^www\./, "");
    } catch {
      // keep full url
    }

    const title = linkTitle.trim() || parsedDomain;

    const newAttachment: TaskAttachment = {
      id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: title,
      size: 0,
      type: "url",
      url: cleanUrl,
      created_at: new Date().toISOString(),
      stage,
      is_external_link: true,
    };

    onChange([...attachments, newAttachment]);
    setLinkUrl("");
    setLinkTitle("");
    setIsAddingLink(false);
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return "link externo";
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with Title and Add Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-300">
            {label || "Anexos & Links Externos"}
          </span>
          {attachments.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              {attachments.length}
            </span>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1.5">
            {/* Add File Button */}
            <button
              type="button"
              disabled={isProcessingFile}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/50 transition-all cursor-pointer shadow-xs"
            >
              {isProcessingFile ? (
                <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
              ) : (
                <Paperclip className="w-3 h-3 text-zinc-400" />
              )}
              <span>Arquivo</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />

            {/* Add External Link Button */}
            <button
              type="button"
              onClick={() => setIsAddingLink((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/50 transition-all cursor-pointer shadow-xs"
            >
              <LinkIcon className="w-3 h-3 text-indigo-400" />
              <span>Link URL</span>
            </button>
          </div>
        )}
      </div>

      {/* Inline Form to Add External Link */}
      {isAddingLink && !readOnly && (
        <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-700/70 space-y-2.5 animate-fadeIn">
          <div className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Adicionar Link Externo (Jira, GitHub, Docs, Figma, etc.)</span>
          </div>

          <div className="space-y-2">
            <input
              type="url"
              placeholder="https://exemplo.com/tarefa/123"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
              className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Título ou descrição do link (ex: Documento de Requisitos)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
              className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsAddingLink(false);
                setLinkUrl("");
                setLinkTitle("");
              }}
              className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddLink}
              disabled={!linkUrl.trim()}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>Vincular Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Render List of Attachments */}
      {attachments.length === 0 ? (
        <div className="text-[11px] text-zinc-500 italic py-1 px-0.5">
          Nenhum anexo ou link vinculado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attachments.map((att) => {
            const isLink =
              att.type === "url" ||
              att.type === "link" ||
              att.is_external_link ||
              att.url?.startsWith("http://") ||
              att.url?.startsWith("https://");
            const isImage = att.type?.startsWith("image/") && !isLink;

            return (
              <div
                key={att.id}
                className="group relative flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Icon or Thumbnail */}
                  {isLink ? (
                    <div className="w-7 h-7 rounded-md bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center shrink-0 text-indigo-400">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                  ) : isImage ? (
                    <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {att.url ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-zinc-200 hover:text-white truncate hover:underline flex items-center gap-1"
                      >
                        <span className="truncate">{att.name}</span>
                        {isLink && (
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60 group-hover:opacity-100 text-indigo-400" />
                        )}
                      </a>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
                      {isLink ? (
                        <span className="text-indigo-400/90 truncate">
                          {getDomainFromUrl(att.url)}
                        </span>
                      ) : (
                        <span>{formatFileSize(att.size)}</span>
                      )}
                      <span>•</span>
                      <span>{att.stage === "resolution" ? "Resolução" : "Criação"}</span>
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(att.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded transition-all ml-1 shrink-0"
                    title="Remover anexo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

