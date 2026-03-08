export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md animate-pulse space-y-6">
        {/* Logo */}
        <div className="mx-auto h-10 w-32 rounded bg-[var(--muted)]" />
        {/* Card */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <div className="h-6 w-24 rounded bg-[var(--muted)]" />
          <div className="h-3 w-48 rounded bg-[var(--muted)]" />
          <div className="space-y-3 pt-2">
            <div className="h-10 w-full rounded-[var(--radius-md)] bg-[var(--muted)]" />
            <div className="h-10 w-full rounded-[var(--radius-md)] bg-[var(--muted)]" />
          </div>
          <div className="h-10 w-full rounded-[var(--radius-md)] bg-[var(--muted)]" />
        </div>
      </div>
    </div>
  );
}
