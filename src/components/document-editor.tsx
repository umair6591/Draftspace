"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import type { Editor, JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { LoadingState, Spinner } from "@/components/spinner";
import { Toast, type ToastState } from "@/components/toast";
import { canEditDocument, emptyDocumentContent } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import type { DocumentRecord, DocumentShare, Permission, Profile } from "@/lib/types";

const shareEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address to share with.");

export function DocumentEditor({ documentId }: { documentId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState("");
  const [permission, setPermission] = useState<Permission | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [shareEmail, setShareEmail] = useState("bob@example.com");
  const dismissToast = useCallback(() => setToast(null), []);

  const userCanEdit =
    Boolean(document && user) &&
    canEditDocument({
      ownerId: document!.owner_id,
      userId: user!.id,
      permission,
    });
  const userIsOwner = Boolean(document && user && document.owner_id === user.id);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: emptyDocumentContent,
    immediatelyRender: false,
    editable: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none rounded-b-3xl bg-white px-4 py-4 outline-none sm:px-8 sm:py-6",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!document || !userCanEdit) return;
      scheduleSave(title, currentEditor.getJSON(), currentEditor.getText());
    },
  });

  const loadDocument = useCallback(async (currentUser: User) => {
    setIsLoading(true);
    setMessage("");
    setToast(null);

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error || !data) {
      const nextMessage = error?.message || "Document not found or access denied.";
      setMessage(nextMessage);
      setToast({ message: nextMessage, variant: "error" });
      setIsLoading(false);
      return;
    }

    const record = data as DocumentRecord;
    let nextPermission: Permission | undefined;

    if (record.owner_id !== currentUser.id) {
      const shareResult = await supabase
        .from("document_shares")
        .select("*")
        .eq("document_id", documentId)
        .eq("shared_with_user_id", currentUser.id)
        .single();

      if (shareResult.error) {
        const nextMessage = "You do not have access to this document.";
        setMessage(nextMessage);
        setToast({ message: nextMessage, variant: "error" });
        setIsLoading(false);
        return;
      }

      nextPermission = (shareResult.data as DocumentShare).permission;
    }

    setDocument(record);
    setTitle(record.title);
    setPermission(nextPermission);
    setLastSavedAt(record.updated_at);
    editor?.commands.setContent(record.content_json ?? emptyDocumentContent);
    setIsLoading(false);
  }, [documentId, editor, supabase]);

  useEffect(() => {
    if (!editor) return;

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/");
        return;
      }

      setUser(data.user);
      loadDocument(data.user);
    });
  }, [editor, loadDocument, router, supabase]);

  useEffect(() => {
    editor?.setEditable(userCanEdit);
  }, [editor, userCanEdit]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  function scheduleSave(
    nextTitle: string,
    contentJson: JSONContent,
    contentText: string,
  ) {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      saveDocument(nextTitle, contentJson, contentText);
    }, 900);
  }

  async function saveDocument(
    nextTitle = title,
    contentJson = editor?.getJSON() ?? emptyDocumentContent,
    contentText = editor?.getText() ?? "",
    notifyOnSuccess = false,
  ) {
    if (!document || !userCanEdit) return;

    setIsSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("documents")
      .update({
        title: nextTitle.trim() || "Untitled document",
        content_json: contentJson,
        content_text: contentText,
      })
      .eq("id", document.id)
      .select("*")
      .single();

    setIsSaving(false);

    if (error) {
      setToast({ message: error.message, variant: "error" });
      return;
    }

    const savedDocument = data as DocumentRecord;
    setDocument(savedDocument);
    setLastSavedAt(savedDocument.updated_at);
    if (notifyOnSuccess) {
      setToast({ message: "Document saved.", variant: "success" });
    }
  }

  function handleTitleChange(nextTitle: string) {
    setTitle(nextTitle);
    if (!editor || !userCanEdit) return;
    scheduleSave(nextTitle, editor.getJSON(), editor.getText());
  }

  async function shareDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!document || !userIsOwner) return;

    const parsedEmail = shareEmailSchema.safeParse(shareEmail);
    if (!parsedEmail.success) {
      setToast({
        message: parsedEmail.error.issues[0]?.message ?? "Enter a valid email.",
        variant: "error",
      });
      return;
    }
    const normalizedEmail = parsedEmail.data;
    setToast(null);

    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (profileResult.error || !profileResult.data) {
      setToast({
        message:
          "No user profile found for that email. Ask them to sign up once, then share again.",
        variant: "error",
      });
      return;
    }

    const profile = profileResult.data as Profile;
    if (profile.id === document.owner_id) {
      setToast({
        message: "Owners already have access to their own documents.",
        variant: "info",
      });
      return;
    }

    const shareResult = await supabase.from("document_shares").upsert({
      document_id: document.id,
      shared_with_user_id: profile.id,
      permission: "editor",
    });

    if (shareResult.error) {
      setToast({ message: shareResult.error.message, variant: "error" });
      return;
    }

    setToast({
      message: `Shared with ${profile.email} as an editor.`,
      variant: "success",
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-600">
        <div className="mx-auto max-w-3xl">
          <LoadingState label="Loading document" />
        </div>
      </main>
    );
  }

  if (!document) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8">
          <p className="text-amber-700">{message}</p>
          <Link className="mt-4 inline-block font-semibold text-cyan-700" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <Toast toast={toast} onDismiss={dismissToast} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <Link href="/dashboard" className="text-sm font-semibold text-cyan-700">
              Back to dashboard
            </Link>
            <input
              className="w-full min-w-0 rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-xl font-semibold outline-none focus:border-cyan-400 sm:text-2xl lg:w-[520px]"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              disabled={!userCanEdit}
            />
            <p className="text-sm text-slate-500">
              {userIsOwner ? "Owned by you" : `Shared with you as ${permission}`} ·{" "}
              {isSaving ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner className="size-3" label="Saving document" />
                  Saving
                </span>
              ) : lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : "Not saved yet"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => saveDocument(undefined, undefined, undefined, true)}
              disabled={!userCanEdit || isSaving}
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" label="Saving document" />
                  Saving
                </span>
              ) : (
                "Save now"
              )}
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              onClick={signOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <Toolbar editor={editor} disabled={!userCanEdit} />
          <EditorContent editor={editor} />
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Access</h2>
            <p className="mt-2 text-sm text-slate-500">
              {userIsOwner
                ? "You own this document and can share editor access by email."
                : "This document was shared with you. Owner-only sharing controls are hidden."}
            </p>

            {userIsOwner ? (
              <form className="mt-4 space-y-3" onSubmit={shareDocument}>
                <label className="block text-sm font-medium text-slate-700">
                  Share with user email
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-500"
                    type="email"
                    value={shareEmail}
                    onChange={(event) => {
                      setShareEmail(event.target.value);
                      setToast(null);
                    }}
                    placeholder="bob@example.com"
                  />
                </label>
                <button className="w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Grant editor access
                </button>
              </form>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            <h2 className="font-semibold text-slate-950">Scope note</h2>
            <p className="mt-2">
              This MVP stores TipTap JSON so formatting survives refreshes. It
              intentionally skips real-time cursors, comments, and version
              history to keep the review flow focused.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Toolbar({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  const buttons = [
    {
      label: "Bold",
      active: editor?.isActive("bold"),
      onClick: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      active: editor?.isActive("italic"),
      onClick: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      active: editor?.isActive("underline"),
      onClick: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      label: "H1",
      active: editor?.isActive("heading", { level: 1 }),
      onClick: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "H2",
      active: editor?.isActive("heading", { level: 2 }),
      onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Bullets",
      active: editor?.isActive("bulletList"),
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbers",
      active: editor?.isActive("orderedList"),
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
      {buttons.map((button) => (
        <button
          key={button.label}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
            button.active
              ? "border-cyan-600 bg-cyan-50 text-cyan-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          } disabled:cursor-not-allowed disabled:opacity-50`}
          onClick={button.onClick}
          disabled={disabled || !editor}
          type="button"
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
