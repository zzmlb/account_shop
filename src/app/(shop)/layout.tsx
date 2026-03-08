import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import CommandMenu from "@/components/search/command-menu";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pt-16 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
      <CommandMenu />
    </div>
  );
}
