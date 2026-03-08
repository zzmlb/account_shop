import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)]">
      {/* Background gradient layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(108,92,231,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,210,255,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(108,92,231,0.06),transparent_40%)]" />
      </div>

      {/* Subtle grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <main id="main-content" className="relative z-10 flex w-full max-w-md flex-col items-center px-4 py-8">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]">
            <span className="text-lg font-bold text-white">P</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            {SITE_NAME}
          </span>
        </Link>

        {/* Auth card container */}
        <div className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl shadow-black/20">
          {children}
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          <span>&copy; {new Date().getFullYear()} {SITE_NAME}. </span>
          <Link href="/" className="hover:text-[var(--primary)] transition-colors">
            返回首页
          </Link>
          <span className="mx-1.5">|</span>
          <Link href="/articles" className="hover:text-[var(--primary)] transition-colors">
            帮助中心
          </Link>
        </div>
      </main>
    </div>
  );
}
