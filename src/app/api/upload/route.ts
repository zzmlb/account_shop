import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { decodeSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { uploadLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("upload");

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    // Auth check - only logged-in admins can upload
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    if (!session) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    // Rate limit
    const rl = uploadLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const role = session.role.toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "无上传权限" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "未选择文件" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "不支持的文件类型，仅支持 JPEG/PNG/WebP/GIF/SVG" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "文件大小不能超过 5MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${random}.${ext}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/${filename}`;

    log.info({ filename, size: file.size, type: file.type }, "File uploaded");

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
    });
  } catch (error) {
    log.error({ err: error }, "Upload error");
    return NextResponse.json(
      { success: false, message: "上传失败" },
      { status: 500 }
    );
  }
}
