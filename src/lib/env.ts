/**
 * Runtime environment variable validation.
 * Import this in server-side code to validate critical env vars at startup.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, defaultValue = ""): string {
  return process.env[name] || defaultValue;
}

export const env = {
  /** Database connection string */
  DATABASE_URL: required("DATABASE_URL"),
  /** HMAC session secret */
  NEXTAUTH_SECRET: required("NEXTAUTH_SECRET"),
  /** Card key encryption key (32 chars) */
  CARD_KEY_SECRET: optional("CARD_KEY_SECRET", ""),
  /** Cron job authorization secret */
  CRON_SECRET: optional("CRON_SECRET", ""),
  /** Log level */
  LOG_LEVEL: optional("LOG_LEVEL", "info"),
  /** Public site URL */
  SITE_URL: optional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
} as const;
