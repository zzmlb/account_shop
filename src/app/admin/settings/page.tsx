"use client";

import { useState } from "react";
import { Save, Globe, CreditCard, Mail, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  /* Site settings */
  const [siteName, setSiteName] = useState("PJ37 数字商城");
  const [siteDescription, setSiteDescription] = useState(
    "高端数字商品一站式交易平台，安全快捷，品质保障"
  );
  const [logoUrl, setLogoUrl] = useState("/logo.svg");
  const [announcement, setAnnouncement] = useState(
    "欢迎光临 PJ37 数字商城！新用户注册即送 5 元优惠券，全场商品限时特惠中。"
  );

  /* Payment settings */
  const [alipayMerchantId, setAlipayMerchantId] = useState("2088xxxxxxxxxxxx");
  const [wechatMerchantId, setWechatMerchantId] = useState("16xxxxxxxx");
  const [alipayEnabled, setAlipayEnabled] = useState(true);
  const [wechatEnabled, setWechatEnabled] = useState(true);
  const [balanceEnabled, setBalanceEnabled] = useState(true);

  /* Email settings */
  const [smtpServer, setSmtpServer] = useState("smtp.example.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUsername, setSmtpUsername] = useState("noreply@example.com");
  const [smtpPassword, setSmtpPassword] = useState("••••••••");
  const [senderName, setSenderName] = useState("PJ37 数字商城");

  /* SEO settings */
  const [seoTitle, setSeoTitle] = useState("PJ37 数字商城 - 高端数字商品交易平台");
  const [seoDescription, setSeoDescription] = useState(
    "PJ37 数字商城提供 Gmail、Netflix、ChatGPT、VPN 等优质数字商品，自动发货，安全可靠。"
  );
  const [seoKeywords, setSeoKeywords] = useState(
    "数字商品,Gmail账号,Netflix会员,ChatGPT,VPN,自动发货"
  );

  const [savingSection, setSavingSection] = useState<string | null>(null);

  const handleSave = (section: string) => {
    setSavingSection(section);
    setTimeout(() => {
      setSavingSection(null);
    }, 1000);
  };

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
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="请输入站点名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="请输入 Logo 图片地址"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">站点描述</Label>
            <Input
              id="siteDescription"
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              placeholder="请输入站点描述"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement">公告内容</Label>
            <textarea
              id="announcement"
              className="flex min-h-[100px] w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="请输入公告内容"
            />
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={() => handleSave("site")}
              disabled={savingSection === "site"}
            >
              <Save className="mr-2 h-4 w-4" />
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
              <Label htmlFor="alipayId">支付宝商户号</Label>
              <Input
                id="alipayId"
                value={alipayMerchantId}
                onChange={(e) => setAlipayMerchantId(e.target.value)}
                placeholder="请输入支付宝商户号"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wechatId">微信商户号</Label>
              <Input
                id="wechatId"
                value={wechatMerchantId}
                onChange={(e) => setWechatMerchantId(e.target.value)}
                placeholder="请输入微信商户号"
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base">支付通道启用</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <Checkbox
                  id="alipayEnabled"
                  checked={alipayEnabled}
                  onCheckedChange={(v) => setAlipayEnabled(!!v)}
                />
                <Label htmlFor="alipayEnabled" className="cursor-pointer font-normal">
                  支付宝
                </Label>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <Checkbox
                  id="wechatEnabled"
                  checked={wechatEnabled}
                  onCheckedChange={(v) => setWechatEnabled(!!v)}
                />
                <Label htmlFor="wechatEnabled" className="cursor-pointer font-normal">
                  微信支付
                </Label>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <Checkbox
                  id="balanceEnabled"
                  checked={balanceEnabled}
                  onCheckedChange={(v) => setBalanceEnabled(!!v)}
                />
                <Label htmlFor="balanceEnabled" className="cursor-pointer font-normal">
                  余额支付
                </Label>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={() => handleSave("payment")}
              disabled={savingSection === "payment"}
            >
              <Save className="mr-2 h-4 w-4" />
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
                value={smtpServer}
                onChange={(e) => setSmtpServer(e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">端口</Label>
              <Input
                id="smtpPort"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="465"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtpUsername">用户名</Label>
              <Input
                id="smtpUsername"
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
                placeholder="noreply@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">密码</Label>
              <Input
                id="smtpPassword"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="SMTP 密码"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderName">发件人名称</Label>
            <Input
              id="senderName"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="PJ37 数字商城"
            />
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={() => handleSave("email")}
              disabled={savingSection === "email"}
            >
              <Save className="mr-2 h-4 w-4" />
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
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="首页 Title 标签"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoDescription">首页描述</Label>
            <textarea
              id="seoDescription"
              className="flex min-h-[80px] w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="首页 Meta Description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoKeywords">首页关键词</Label>
            <Input
              id="seoKeywords"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="关键词1,关键词2,关键词3"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              多个关键词用英文逗号分隔
            </p>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={() => handleSave("seo")}
              disabled={savingSection === "seo"}
            >
              <Save className="mr-2 h-4 w-4" />
              {savingSection === "seo" ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
