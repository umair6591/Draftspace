import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  replace: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
    },
    from: () => ({
      upsert: mocks.upsert,
    }),
  }),
}));

describe("auth page flow", () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.replace.mockReset();
    mocks.signInWithPassword.mockClear();
    mocks.signUp.mockClear();
    mocks.upsert.mockClear();
  });

  it("shows a validation toast and does not call Supabase for invalid email", async () => {
    render(<Home />);

    const submitButton = screen.getByRole("button", { name: "Open workspace" });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.submit(submitButton.closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a valid email address.",
    );
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in with normalized email and redirects to the dashboard", async () => {
    render(<Home />);

    const submitButton = screen.getByRole("button", { name: "Open workspace" });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "  UMAIR.TECHLIFE@GMAIL.COM  " },
    });
    fireEvent.submit(submitButton.closest("form")!);

    await waitFor(() => {
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "umair.techlife@gmail.com",
        password: "password123",
      });
    });
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard");
  });
});
