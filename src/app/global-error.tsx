"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
            出错了
          </h1>
          <p style={{ color: "#666", marginBottom: "2rem" }}>
            {error.message || "发生了意外错误，请刷新页面重试"}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "0.5rem",
              border: "1px solid #ddd",
              background: "#000",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            刷新页面
          </button>
        </div>
      </body>
    </html>
  );
}
