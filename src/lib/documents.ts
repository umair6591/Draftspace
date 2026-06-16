import type { JSONContent } from "@tiptap/core";
import type { Permission } from "@/lib/types";

export const supportedImportExtensions = [".txt", ".md"] as const;

export const emptyDocumentContent: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function fileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

export function validateImportFile(fileName: string) {
  const extension = fileExtension(fileName);

  if (!supportedImportExtensions.includes(extension as ".txt" | ".md")) {
    return {
      valid: false,
      error: "Only .txt and .md files are supported for import.",
    };
  }

  return { valid: true, error: null };
}

export function titleFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const normalized = withoutExtension.replace(/[-_]+/g, " ").trim();
  return normalized || "Imported document";
}

export function plainTextToTiptap(text: string): JSONContent {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return emptyDocumentContent;
  }

  return {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph }],
    })),
  };
}

export function canEditDocument(args: {
  ownerId: string;
  userId: string;
  permission?: Permission;
}) {
  return args.ownerId === args.userId || args.permission === "editor";
}
