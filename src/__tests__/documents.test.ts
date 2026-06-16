import { describe, expect, it } from "vitest";
import {
  canEditDocument,
  plainTextToTiptap,
  titleFromFileName,
  validateImportFile,
} from "../lib/documents";

describe("document helpers", () => {
  it("accepts only the file types supported by the import workflow", () => {
    expect(validateImportFile("notes.md")).toEqual({
      valid: true,
      error: null,
    });
    expect(validateImportFile("brief.txt")).toEqual({
      valid: true,
      error: null,
    });
    expect(validateImportFile("proposal.docx")).toEqual({
      valid: false,
      error: "Only .txt and .md files are supported for import.",
    });
  });

  it("turns uploaded file names and text into editable document data", () => {
    expect(titleFromFileName("team-retro_notes.md")).toBe("team retro notes");
    expect(plainTextToTiptap("Hello\n\nWorld")).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "World" }],
        },
      ],
    });
  });

  it("allows owners and shared editors to edit documents", () => {
    expect(
      canEditDocument({ ownerId: "alice", userId: "alice", permission: undefined }),
    ).toBe(true);
    expect(
      canEditDocument({ ownerId: "alice", userId: "bob", permission: "editor" }),
    ).toBe(true);
    expect(
      canEditDocument({ ownerId: "alice", userId: "bob", permission: "viewer" }),
    ).toBe(false);
  });
});
