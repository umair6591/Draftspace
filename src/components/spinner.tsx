import { clsx } from "clsx";

export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-label={label}
      className={clsx(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      role="status"
    />
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-6 text-sm font-medium text-slate-500">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
