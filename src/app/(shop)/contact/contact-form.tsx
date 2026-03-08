"use client";

import { useState, useRef } from "react";
import { Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "", // honeypot field
  });
  const mountedAt = useRef(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, _t: mountedAt.current }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setForm({ name: "", email: "", subject: "", message: "", website: "" });
      } else {
        setError(data.message || "提交失败，请稍后重试");
      }
    } catch {
      setError("网络错误，请稍后重试");
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
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            姓名 <span className="text-[var(--destructive)]">*</span>
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="您的姓名"
            required
            minLength={2}
            maxLength={50}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            邮箱 <span className="text-[var(--destructive)]">*</span>
          </label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="your@email.com"
            required
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          主题 <span className="text-[var(--destructive)]">*</span>
        </label>
        <Input
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          placeholder="留言主题"
          required
          minLength={2}
          maxLength={100}
        />
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          留言内容 <span className="text-[var(--destructive)]">*</span>
        </label>
        <Textarea
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

      {error && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-4 py-2 text-sm text-[var(--destructive)]">
          {error}
        </div>
      )}

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
