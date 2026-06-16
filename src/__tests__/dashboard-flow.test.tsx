import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";
import { emptyDocumentContent } from "@/lib/documents";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  ownedResult: { data: [], error: null } as { data: unknown[]; error: null | Error },
  sharesResult: { data: [], error: null } as { data: unknown[]; error: null | Error },
  sharedDocumentsResult: { data: [], error: null } as {
    data: unknown[];
    error: null | Error;
  },
}));

function createQueryBuilder(table: string) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(async () => mocks.sharedDocumentsResult),
    order: vi.fn(async () =>
      table === "documents" ? mocks.ownedResult : mocks.sharesResult,
    ),
  };

  return builder;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
      signOut: mocks.signOut,
    },
    from: (table: string) => createQueryBuilder(table),
    rpc: mocks.rpc,
  }),
}));

describe("dashboard flow", () => {
  beforeEach(() => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "umair.techlife@gmail.com" } },
    });
    mocks.rpc.mockReset();
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.ownedResult = { data: [], error: null };
    mocks.sharesResult = { data: [], error: null };
    mocks.sharedDocumentsResult = { data: [], error: null };
  });

  it("renders empty owned and shared states after loading documents", async () => {
    render(<DashboardPage />);

    expect(await screen.findByText("Owned documents")).toBeInTheDocument();
    expect(
      screen.getByText("Create a document or import a file to get started."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Documents shared with your account will appear here."),
    ).toBeInTheDocument();
  });

  it("creates a new document through the create_document RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: "doc-1" },
      error: null,
    });

    render(<DashboardPage />);

    fireEvent.click(await screen.findByRole("button", { name: "New document" }));

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith("create_document", {
        document_title: "Untitled document",
        document_content_json: emptyDocumentContent,
        document_content_text: "",
      });
      expect(mocks.push).toHaveBeenCalledWith("/documents/doc-1");
    });
  });

  it("shows a toast for unsupported import files without creating a document", async () => {
    const { container } = render(<DashboardPage />);

    await screen.findByText("Owned documents");
    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    expect(input).not.toBeNull();

    fireEvent.change(input!, {
      target: {
        files: [new File(["bad"], "proposal.pdf", { type: "application/pdf" })],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only .txt and .md files are supported for import.",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("imports a supported text file as a new document", async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: "imported-doc" },
      error: null,
    });
    const file = new File([""], "meeting-notes.txt", { type: "text/plain" });
    Object.defineProperty(file, "text", {
      value: vi.fn().mockResolvedValue("Hello\n\nWorld"),
    });
    const { container } = render(<DashboardPage />);

    await screen.findByText("Owned documents");
    const input = container.querySelector<HTMLInputElement>("input[type='file']");

    fireEvent.change(input!, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith("create_document", {
        document_title: "meeting notes",
        document_content_json: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
            { type: "paragraph", content: [{ type: "text", text: "World" }] },
          ],
        },
        document_content_text: "Hello\n\nWorld",
      });
      expect(mocks.push).toHaveBeenCalledWith("/documents/imported-doc");
    });
  });
});
