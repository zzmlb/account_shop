import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import CommandMenu from "@/components/search/command-menu";
import ScrollToTop from "@/components/shared/scroll-to-top";
import AnnouncementBanner from "@/components/home/announcement-banner";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--primary-foreground)]"
      >
        跳到主要内容
      </a>
      <AnnouncementBanner />
      <Header />
      <main id="main-content" className="flex-1 pt-16 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
      <CommandMenu />
      <ScrollToTop />
    </div>
  );
}
