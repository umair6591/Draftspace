"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LoadingState, Spinner } from "@/components/spinner";
import { Toast, type ToastState } from "@/components/toast";
import {
  emptyDocumentContent,
  plainTextToTiptap,
  titleFromFileName,
  validateImportFile,
} from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import type { DocumentRecord, DocumentShare, Permission } from "@/lib/types";

type DocumentCard = DocumentRecord & {
  access: "owned" | "shared";
  permission?: Permission;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ownedDocuments, setOwnedDocuments] = useState<DocumentCard[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentCard[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const dismissToast = useCallback(() => setToast(null), []);

  const loadDocuments = useCallback(async (userId: string) => {
    setIsLoading(true);
    setToast(null);

    const [ownedResult, sharesResult] = await Promise.all([
      supabase
        .from("documents")
        .select("*")
        .eq("owner_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("document_shares")
        .select("*")
        .eq("shared_with_user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (ownedResult.error || sharesResult.error) {
      setToast({
        message:
          ownedResult.error?.message ||
          sharesResult.error?.message ||
          "Unable to load documents.",
        variant: "error",
      });
      setIsLoading(false);
      return;
    }

    const shares = (sharesResult.data ?? []) as DocumentShare[];
    const sharedIds = shares.map((share) => share.document_id);
    const sharedResult =
      sharedIds.length > 0
        ? await supabase.from("documents").select("*").in("id", sharedIds)
        : { data: [], error: null };

    if (sharedResult.error) {
      setToast({ message: sharedResult.error.message, variant: "error" });
      setIsLoading(false);
      return;
    }

    const permissionByDocument = new Map(
      shares.map((share) => [share.document_id, share.permission]),
    );

    setOwnedDocuments(
      ((ownedResult.data ?? []) as DocumentRecord[]).map((document) => ({
        ...document,
        access: "owned" as const,
      })),
    );
    setSharedDocuments(
      ((sharedResult.data ?? []) as DocumentRecord[])
        .map((document) => ({
          ...document,
          access: "shared" as const,
          permission: permissionByDocument.get(document.id),
        }))
        .sort(
          (first, second) =>
            new Date(second.updated_at).getTime() -
            new Date(first.updated_at).getTime(),
        ),
    );
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/");
        return;
      }

      setUser(data.user);
      loadDocuments(data.user.id);
    });
  }, [loadDocuments, router, supabase]);

  async function createDocument() {
    if (!user) return;

    setIsCreating(true);
    setToast(null);

    const { data, error } = await supabase
      .rpc("create_document", {
        document_title: "Untitled document",
        document_content_json: emptyDocumentContent,
        document_content_text: "",
      });

    if (error || !data) {
      setToast({
        message: error?.message ?? "Unable to create a document.",
        variant: "error",
      });
      setIsCreating(false);
      return;
    }

    router.push(`/documents/${data.id}`);
  }

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) return;

    const validation = validateImportFile(file.name);
    if (!validation.valid) {
      setToast({
        message: validation.error ?? "Unsupported file type.",
        variant: "error",
      });
      return;
    }

    if (file.size > 500_000) {
      setToast({
        message: "Please import a file smaller than 500 KB for this MVP.",
        variant: "error",
      });
      return;
    }

    setIsImporting(true);
    setToast(null);

    try {
      const text = await file.text();
      const { data, error } = await supabase
        .rpc("create_document", {
          document_title: titleFromFileName(file.name),
          document_content_json: plainTextToTiptap(text),
          document_content_text: text,
        });

      if (error || !data) {
        setToast({
          message: error?.message ?? "Unable to import that file.",
          variant: "error",
        });
        setIsImporting(false);
        return;
      }

      setToast({ message: "File imported successfully.", variant: "success" });
      router.push(`/documents/${data.id}`);
    } catch {
      setToast({
        message: "Could not read that file. Please try another .txt or .md file.",
        variant: "error",
      });
      setIsImporting(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <Toast toast={toast} onDismiss={dismissToast} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-700">DraftSpace</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Document workspace
            </h1>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:flex md:flex-wrap">
            <label
              className={`flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 ${
                isImporting
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer"
              }`}
            >
              {isImporting ? (
                <>
                  <Spinner className="size-4" label="Importing file" />
                  Importing
                </>
              ) : (
                "Import .txt/.md"
              )}
              <input
                className="hidden"
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={importFile}
                disabled={isImporting}
              />
            </label>
            <button
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={createDocument}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Spinner className="size-4" label="Creating document" />
                  Creating
                </>
              ) : (
                "New document"
              )}
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"
              onClick={signOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Upload support is intentionally limited to `.txt` and `.md` files.
          Imported files become new editable documents with preserved text
          content.
        </div>

        {isLoading ? (
          <LoadingState label="Loading documents" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <DocumentSection
              title="Owned documents"
              emptyText="Create a document or import a file to get started."
              documents={ownedDocuments}
            />
            <DocumentSection
              title="Shared with me"
              emptyText="Documents shared with your account will appear here."
              documents={sharedDocuments}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function DocumentSection({
  title,
  emptyText,
  documents,
}: {
  title: string;
  emptyText: string;
  documents: DocumentCard[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-3">
        {documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            {emptyText}
          </p>
        ) : (
          documents.map((document) => (
            <Link
              key={document.id}
              href={`/documents/${document.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{document.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {document.content_text || "No content yet."}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {document.access === "owned"
                    ? "Owner"
                    : document.permission ?? "Shared"}
                </span>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Updated {new Date(document.updated_at).toLocaleString()}
              </p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
