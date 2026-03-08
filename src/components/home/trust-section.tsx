import { Zap, Shield, Headphones, Award, type LucideIcon } from "lucide-react";
import { TRUST_FEATURES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Shield,
  Headphones,
  Award,
};

export default function TrustSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      {/* Section header */}
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          为什么选择我们
        </h2>
        <p className="mt-3 text-[var(--muted-foreground)]">
          专业的数字商品交易平台，为您提供最优质的服务
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_FEATURES.map((feature) => {
          const Icon = ICON_MAP[feature.icon];
          return (
            <div
              key={feature.title}
              className={cn(
                "group flex flex-col items-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 text-center",
                "transition-all duration-300",
                "hover:border-[var(--primary)]/50 hover:bg-[var(--card-hover)]",
                "hover:shadow-[0_0_30px_rgba(108,92,231,0.12)]"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full",
                  "bg-[var(--primary)]/10 text-[var(--primary)]",
                  "transition-all duration-300",
                  "group-hover:bg-[var(--primary)]/20 group-hover:scale-110"
                )}
              >
                {Icon && <Icon className="h-7 w-7" />}
              </div>

              {/* Title */}
              <h3 className="mt-5 text-base font-semibold text-[var(--foreground)]">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
