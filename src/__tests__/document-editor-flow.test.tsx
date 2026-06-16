import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentEditor } from "@/components/document-editor";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  getUser: vi.fn(),
  setContent: vi.fn(),
  setEditable: vi.fn(),
  getJSON: vi.fn(),
  getText: vi.fn(),
  updatePayload: null as unknown,
  documentResult: {
    data: {
      id: "doc-1",
      owner_id: "owner-1",
      title: "Roadmap",
      content_json: { type: "doc", content: [{ type: "paragraph" }] },
      content_text: "Initial text",
      created_at: "2026-06-16T10:00:00.000Z",
      updated_at: "2026-06-16T10:00:00.000Z",
    },
    error: null,
  } as { data: unknown; error: null | Error },
  saveResult: {
    data: {
      id: "doc-1",
      owner_id: "owner-1",
      title: "Roadmap",
      content_json: { type: "doc", content: [{ type: "paragraph" }] },
      content_text: "Updated text",
      created_at: "2026-06-16T10:00:00.000Z",
      updated_at: "2026-06-16T10:05:00.000Z",
    },
    error: null,
  } as { data: unknown; error: null | Error },
  profileResult: {
    data: {
      id: "recipient-1",
      email: "bob@example.com",
      full_name: "Bob Reviewer",
    },
    error: null,
  } as { data: unknown; error: null | Error },
  shareLookupResult: {
    data: {
      id: "share-1",
      document_id: "doc-1",
      shared_with_user_id: "owner-1",
      permission: "editor",
      created_at: "2026-06-16T10:00:00.000Z",
    },
    error: null,
  } as { data: unknown; error: null | Error },
  shareUpsert: vi.fn(),
}));

function createQueryBuilder(table: string) {
  const builder = {
    mode: "select",
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn((payload: unknown) => {
      mocks.updatePayload = payload;
      builder.mode = "update";
      return builder;
    }),
    single: vi.fn(async () => {
      if (table === "documents" && builder.mode === "update") {
        return mocks.saveResult;
      }
      if (table === "documents") {
        return mocks.documentResult;
      }
      if (table === "profiles") {
        return mocks.profileResult;
      }
      return mocks.shareLookupResult;
    }),
    upsert: vi.fn((payload: unknown) => mocks.shareUpsert(payload)),
  };

  return builder;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock("@tiptap/react", () => ({
  EditorContent: () => <div data-testid="editor-content" />,
  useEditor: () => ({
    commands: {
      setContent: mocks.setContent,
    },
    setEditable: mocks.setEditable,
    getJSON: mocks.getJSON,
    getText: mocks.getText,
    isActive: () => false,
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: vi.fn() }),
        toggleItalic: () => ({ run: vi.fn() }),
        toggleUnderline: () => ({ run: vi.fn() }),
        toggleHeading: () => ({ run: vi.fn() }),
        toggleBulletList: () => ({ run: vi.fn() }),
        toggleOrderedList: () => ({ run: vi.fn() }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
      signOut: vi.fn(),
    },
    from: (table: string) => createQueryBuilder(table),
  }),
}));

describe("document editor flow", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.setContent.mockReset();
    mocks.setEditable.mockReset();
    mocks.shareUpsert.mockReset();
    mocks.updatePayload = null;
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "owner-1", email: "owner@example.com" } },
    });
    mocks.getJSON.mockReturnValue({ type: "doc", content: [{ type: "paragraph" }] });
    mocks.getText.mockReturnValue("Updated text");
    mocks.shareUpsert.mockResolvedValue({ error: null });
  });

  it("loads an owned document and saves it manually", async () => {
    render(<DocumentEditor documentId="doc-1" />);

    expect(await screen.findByDisplayValue("Roadmap")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save now" }));

    await waitFor(() => {
      expect(mocks.updatePayload).toEqual({
        title: "Roadmap",
        content_json: { type: "doc", content: [{ type: "paragraph" }] },
        content_text: "Updated text",
      });
    });
  });

  it("validates share emails before looking up a profile", async () => {
    render(<DocumentEditor documentId="doc-1" />);

    await screen.findByDisplayValue("Roadmap");
    const submitButton = screen.getByRole("button", { name: "Grant editor access" });
    fireEvent.change(screen.getByLabelText("Share with user email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.submit(submitButton.closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a valid email address to share with.",
    );
    expect(mocks.shareUpsert).not.toHaveBeenCalled();
  });

  it("shares an owned document with a signed-up user", async () => {
    render(<DocumentEditor documentId="doc-1" />);

    await screen.findByDisplayValue("Roadmap");
    const submitButton = screen.getByRole("button", { name: "Grant editor access" });
    fireEvent.submit(submitButton.closest("form")!);

    await waitFor(() => {
      expect(mocks.shareUpsert).toHaveBeenCalledWith({
        document_id: "doc-1",
        shared_with_user_id: "recipient-1",
        permission: "editor",
      });
    });
  });
});
