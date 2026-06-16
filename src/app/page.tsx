"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Spinner } from "@/components/spinner";
import { Toast, type ToastState } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";

const authFormSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  fullName: z.string().trim().max(80, "Full name must be 80 characters or less."),
});

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("alice@example.com");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("Alice Reviewer");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [toast, setToast] = useState<ToastState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      }
    });
  }, [router, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);

    const parsedForm = authFormSchema.safeParse({ email, password, fullName });
    if (!parsedForm.success) {
      setToast({
        message: parsedForm.error.issues[0]?.message ?? "Check the form fields.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);

    const { email: normalizedEmail, fullName: normalizedFullName } =
      parsedForm.data;
    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })
        : await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: { full_name: normalizedFullName || normalizedEmail },
            },
          });

    setIsSubmitting(false);

    if (result.error) {
      setToast({ message: result.error.message, variant: "error" });
      return;
    }

    const userId = result.data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        email: normalizedEmail,
        full_name: normalizedFullName || normalizedEmail,
      });
    }

    setToast({
      message: mode === "sign-in" ? "Signed in successfully." : "Account created.",
      variant: "success",
    });
    router.replace("/dashboard");
  }

  function switchMode(nextMode: "sign-in" | "sign-up") {
    setMode(nextMode);
    setToast(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Toast toast={toast} onDismiss={dismissToast} />
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:py-10">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-sm font-medium text-cyan-100">
            DraftSpace MVP
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            A focused collaborative document editor for fast-moving teams.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
            Create rich-text drafts, import text or Markdown files, and share
            editable documents with teammates. Built as a deliberately scoped
            take-home product slice.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:mt-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <strong className="block text-white">Rich editing</strong>
              Bold, italic, underline, headings, and lists.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <strong className="block text-white">File import</strong>
              Upload `.txt` or `.md` into a new draft.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <strong className="block text-white">Sharing</strong>
              Owned and shared documents are clearly separated.
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-4 text-slate-950 shadow-2xl sm:p-6">
          <div className="mb-6 flex rounded-full bg-slate-100 p-1 text-sm font-medium">
            <button
              className={`flex-1 rounded-full px-4 py-2 ${
                mode === "sign-in" ? "bg-slate-950 text-white" : "text-slate-600"
              }`}
              onClick={() => switchMode("sign-in")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`flex-1 rounded-full px-4 py-2 ${
                mode === "sign-up" ? "bg-slate-950 text-white" : "text-slate-600"
              }`}
              onClick={() => switchMode("sign-up")}
              type="button"
            >
              Sign up
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <label className="block text-sm font-medium text-slate-700">
                Full name
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-500"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setToast(null);
                  }}
                  placeholder="Alice Reviewer"
                />
              </label>
            ) : null}

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-500"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setToast(null);
                }}
                type="email"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-500"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setToast(null);
                }}
                type="password"
                minLength={6}
                required
              />
            </label>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? <Spinner className="size-4" label="Submitting" /> : null}
              {isSubmitting
                ? "Submitting"
                : mode === "sign-in"
                  ? "Open workspace"
                  : "Create account"}
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}
