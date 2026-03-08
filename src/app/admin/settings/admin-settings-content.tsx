"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Globe,
  CreditCard,
  Mail,
  Search as SearchIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// All settings keys managed by this page
const SETTINGS_KEYS = [
  "site_name",
  "site_description",
  "logo_url",
  "announcement",
  "alipay_merchant_id",
  "wechat_merchant_id",
  "alipay_enabled",
  "wechat_enabled",
  "balance_enabled",
  "smtp_server",
  "smtp_port",
  "smtp_username",
  "smtp_password",
  "sender_name",
  "seo_title",
  "seo_description",
  "seo_keywords",
] as const;

type SettingsKey = (typeof SETTINGS_KEYS)[number];
type SettingsMap = Record<SettingsKey, string>;

const DEFAULT_SETTINGS: SettingsMap = {
  site_name: "",
  site_description: "",
  logo_url: "",
  announcement: "",
  alipay_merchant_id: "",
  wechat_merchant_id: "",
  alipay_enabled: "false",
  wechat_enabled: "false",
  balance_enabled: "false",
  smtp_server: "",
  smtp_port: "",
  smtp_username: "",
  smtp_password: "",
  sender_name: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
};

export default function AdminSettingsPageContent() {
  const [settings, setSettings] = useState<SettingsMap>({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Fetch settings from API on mount
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        const merged = { ...DEFAULT_SETTINGS };
        for (const key of SETTINGS_KEYS) {
          if (data.settings[key] !== undefined) {
            merged[key] = data.settings[key];
          }
        }
        setSettings(merged);
      } else {
        toast.error(data.message || "获取设置失败");
      }
    } catch {
      toast.error("网络错误，无法加载设置");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Helper to update a single setting in local state
  const updateSetting = (key: SettingsKey, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Save a subset of settings keys to the API
  const handleSave = async (section: string, keys: SettingsKey[]) => {
    setSavingSection(section);
    try {
      const payload: Record<string, string> = {};
      for (const key of keys) {
        payload[key] = settings[key];
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "设置已保存");
      } else {
        toast.error(data.message || "保存失败");
      }
    } catch {
      toast.error("网络错误，保存失败");
    } finally {
      setSavingSection(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">加载设置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          管理站点配置、支付、邮件和 SEO 设置
        </p>
      </div>

      {/* Site settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10">
              <Globe className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle className="text-lg">站点设置</CardTitle>
              <CardDescription>配置站点基本信息和公告内容</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteName">站点名称</Label>
              <Input
                id="siteName"
                value={settings.site_name}
                onChange={(e) => updateSetting("site_name", e.target.value)}
                placeholder="请输入站点名称"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={settings.logo_url}
                onChange={(e) => updateSetting("logo_url", e.target.value)}
                placeholder="https://example.com/logo.png"
                maxLength={500}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">站点描述</Label>
            <Input
              id="siteDescription"
              value={settings.site_description}
              onChange={(e) =>
                updateSetting("site_description", e.target.value)
              }
              placeholder="请输入站点描述"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement">公告内容</Label>
            <textarea
              id="announcement"
              className="flex min-h-[100px] w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              value={settings.announcement}
              onChange={(e) =>
                updateSetting("announcement", e.target.value)
              }
              placeholder="请输入公告内容"
              maxLength={500}
            />
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={() =>
                handleSave("site", [
                  "site_name",
                  "site_description",
                  "logo_url",
                  "announcement",
                ])
              }
              disabled={savingSection === "site"}
            >
              {savingSection === "site" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {savingSection === "site" ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--success)]/10">
              <CreditCard className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div>
              <CardTitle className="text-lg">支付设置</CardTitle>
              <CardDescription>配置支付通道和商户信息</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alipayMerchantId">支付宝商户 ID</Label>
              <Input
                id="alipayMerchantId"
                value={settings.alipay_merchant_id}
                onChange={(e) =>
                  updateSetting("alipay_merchant_id", e.target.value)
                }
                placeholder="请输入支付宝商户 ID"
                maxLength={64}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wechatMerchantId">微信商户 ID</Label>
              <Input
                id="wechatMerchantId"
                value={settings.wechat_merchant_id}
                onChange={(e) =>
                  updateSetting("wechat_merchant_id", e.target.value)
                }
                placeholder="请输入微信商户 ID"
                maxLength={64}
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-base">支付通道启用</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <Checkbox
                  id="alipayEnabled"
                  checked={settings.alipay_enabled === "true"}
                  onCheckedChange={(v) =>
                    updateSetting(
                      "alipay_enabled",
                      v ? "true" : "false"
                    )
                  }
                />
                <Label
                  htmlFor="alipayEnabled"
                  className="cursor-pointer font-normal"
                >
                  支付宝
                </Label>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <Checkbox
                  id="wechatEnabled"
                  checked={settings.wechat_enabled === "true"}
                  onCheckedChange={(v) =>
                    updateSetting(
                      "wechat_enabled",
                      v ? "true" : "false"
                    )
                  }
                />
                <Label
                  htmlFor="wechatEnabled"
                  className="cursor-pointer font-normal"
                >
                  微信支付
                </Label>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <Checkbox
                  id="balanceEnabled"
                  checked={settings.balance_enabled === "true"}
                  onCheckedChange={(v) =>
                    updateSetting(
                      "balance_enabled",
                      v ? "true" : "false"
                    )
                  }
                />
                <Label
                  htmlFor="balanceEnabled"
                  className="cursor-pointer font-normal"
                >
                  余额支付
                </Label>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={() =>
                handleSave("payment", [
                  "alipay_merchant_id",
                  "wechat_merchant_id",
                  "alipay_enabled",
                  "wechat_enabled",
                  "balance_enabled",
                ])
              }
              disabled={savingSection === "payment"}
            >
              {savingSection === "payment" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {savingSection === "payment" ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--warning)]/10">
              <Mail className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <CardTitle className="text-lg">邮件设置</CardTitle>
              <CardDescription>配置 SMTP 邮件服务器参数</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtpServer">SMTP 服务器</Label>
              <Input
                id="smtpServer"
                value={settings.smtp_server}
                onChange={(e) => updateSetting("smtp_server", e.target.value)}
                placeholder="smtp.example.com"
                maxLength={253}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">端口</Label>
              <Input
                id="smtpPort"
                value={settings.smtp_port}
                onChange={(e) => updateSetting("smtp_port", e.target.value)}
                placeholder="465"
                maxLength={5}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtpUsername">用户名</Label>
              <Input
                id="smtpUsername"
                value={settings.smtp_username}
                onChange={(e) => updateSetting("smtp_username", e.target.value)}
                placeholder="noreply@example.com"
                maxLength={254}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">密码</Label>
              <Input
                id="smtpPassword"
                type="password"
                value={settings.smtp_password}
                onChange={(e) => updateSetting("smtp_password", e.target.value)}
                placeholder="SMTP 密码"
                maxLength={128}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="senderName">发件人名称</Label>
              <Input
                id="senderName"
                value={settings.sender_name}
                onChange={(e) => updateSetting("sender_name", e.target.value)}
                placeholder="站点通知"
                maxLength={50}
              />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={() =>
                handleSave("email", [
                  "smtp_server",
                  "smtp_port",
                  "smtp_username",
                  "smtp_password",
                  "sender_name",
                ])
              }
              disabled={savingSection === "email"}
            >
              {savingSection === "email" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {savingSection === "email" ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEO settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)]/10">
              <SearchIcon className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <CardTitle className="text-lg">SEO 设置</CardTitle>
              <CardDescription>
                优化搜索引擎收录，提升站点曝光
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seoTitle">首页标题</Label>
            <Input
              id="seoTitle"
              value={settings.seo_title}
              onChange={(e) => updateSetting("seo_title", e.target.value)}
              placeholder="首页 Title 标签"
              maxLength={70}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoDescription">首页描述</Label>
            <textarea
              id="seoDescription"
              className="flex min-h-[80px] w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              value={settings.seo_description}
              onChange={(e) =>
                updateSetting("seo_description", e.target.value)
              }
              placeholder="首页 Meta Description"
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoKeywords">首页关键词</Label>
            <Input
              id="seoKeywords"
              value={settings.seo_keywords}
              onChange={(e) => updateSetting("seo_keywords", e.target.value)}
              placeholder="关键词1,关键词2,关键词3"
              maxLength={300}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              多个关键词用英文逗号分隔
            </p>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={() =>
                handleSave("seo", [
                  "seo_title",
                  "seo_description",
                  "seo_keywords",
                ])
              }
              disabled={savingSection === "seo"}
            >
              {savingSection === "seo" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {savingSection === "seo" ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
