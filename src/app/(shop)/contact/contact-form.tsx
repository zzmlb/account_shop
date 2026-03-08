"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { apiMutate } from "@/lib/api-fetch";

const CATEGORIES = [
  { value: "support", label: "技术支持" },
  { value: "billing", label: "支付/账单问题" },
  { value: "feedback", label: "意见反馈" },
  { value: "other", label: "其他" },
];

export default function ContactForm() {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "",
    subject: "",
    message: "",
    website: "", // honeypot field
  });
  const mountedAt = useRef(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill name/email for logged-in users
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.username,
        email: f.email || user.email,
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await apiMutate("/api/contact", "POST", { ...form, _t: mountedAt.current });
      toast.success("留言已提交", { description: "我们会尽快通过邮件回复您" });
      setSuccess(true);
      setForm({ name: "", email: "", category: "", subject: "", message: "", website: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-green-500/30 bg-green-500/5 p-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">
          留言已提交
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          感谢您的反馈，我们会尽快通过邮件回复您。
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setSuccess(false)}
        >
          继续留言
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            姓名 <span className="text-[var(--destructive)]">*</span>
          </label>
          <Input
            id="contact-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="您的姓名"
            required
            minLength={2}
            maxLength={50}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            邮箱 <span className="text-[var(--destructive)]">*</span>
          </label>
          <Input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="your@email.com"
            required
            maxLength={100}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          问题类型
        </label>
        <Select
          value={form.category}
          onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
        >
          <SelectTrigger aria-label="选择问题类型">
            <SelectValue placeholder="选择问题类型（可选）" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          主题 <span className="text-[var(--destructive)]">*</span>
        </label>
        <Input
          id="contact-subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          placeholder="留言主题"
          required
          minLength={2}
          maxLength={100}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          留言内容 <span className="text-[var(--destructive)]">*</span>
        </label>
        <Textarea
          id="contact-message"
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder="请详细描述您的问题或建议（至少10字）"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
        />
        <p className="mt-1 text-right text-xs text-[var(--muted-foreground)]">
          {form.message.length}/2000
        </p>
      </div>

      {/* Honeypot field - hidden from real users, bots will fill it */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div aria-live="assertive" aria-atomic="true">
        {error && (
          <div role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-4 py-2 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="mt-6 w-full gap-2"
        disabled={submitting}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {submitting ? "提交中..." : "提交留言"}
      </Button>
    </form>
  );
}
