import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoadingState, Spinner } from "@/components/spinner";
import { Toast } from "@/components/toast";

describe("feedback UI", () => {
  it("renders an accessible spinner and loading state", () => {
    render(
      <>
        <Spinner label="Saving document" />
        <LoadingState label="Loading documents" />
      </>,
    );

    expect(screen.getByRole("status", { name: "Saving document" })).toBeInTheDocument();
    expect(screen.getByText("Loading documents")).toBeInTheDocument();
  });

  it("renders error toasts as alerts", () => {
    render(
      <Toast
        toast={{ message: "Something went wrong", variant: "error" }}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("does not render when no toast is active", () => {
    const { container } = render(<Toast toast={null} onDismiss={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
