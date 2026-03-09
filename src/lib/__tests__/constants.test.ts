import { describe, it, expect } from "vitest";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  ORDER_EXPIRE_MINUTES,
  AFTER_SALE_HOURS,
  ITEMS_PER_PAGE,
  BLUR_DATA_URL,
  NAV_LINKS,
  TRUST_FEATURES,
  SEARCH_DEBOUNCE_MS,
  COPY_FEEDBACK_MS,
  NOTIFICATION_POLL_INTERVAL_MS,
  ACTIVITY_ROTATION_MS,
  SHARE_POPUP_WIDTH,
  SHARE_POPUP_HEIGHT,
} from "../constants";

describe("constants", () => {
  it("SITE_NAME is a non-empty string", () => {
    expect(typeof SITE_NAME).toBe("string");
    expect(SITE_NAME.length).toBeGreaterThan(0);
  });

  it("SITE_DESCRIPTION is a non-empty string", () => {
    expect(typeof SITE_DESCRIPTION).toBe("string");
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(0);
  });

  it("ORDER_EXPIRE_MINUTES is a positive number", () => {
    expect(ORDER_EXPIRE_MINUTES).toBeGreaterThan(0);
  });

  it("AFTER_SALE_HOURS is a positive number", () => {
    expect(AFTER_SALE_HOURS).toBeGreaterThan(0);
  });

  it("ITEMS_PER_PAGE is a positive number", () => {
    expect(ITEMS_PER_PAGE).toBeGreaterThan(0);
  });

  it("BLUR_DATA_URL starts with data:", () => {
    expect(BLUR_DATA_URL).toMatch(/^data:/);
  });

  it("NAV_LINKS has at least one item with label and href", () => {
    expect(NAV_LINKS.length).toBeGreaterThan(0);
    for (const link of NAV_LINKS) {
      expect(link).toHaveProperty("label");
      expect(link).toHaveProperty("href");
      expect(typeof link.label).toBe("string");
      expect(typeof link.href).toBe("string");
    }
  });

  it("TRUST_FEATURES has at least one item", () => {
    expect(TRUST_FEATURES.length).toBeGreaterThan(0);
    for (const feature of TRUST_FEATURES) {
      expect(feature).toHaveProperty("title");
      expect(feature).toHaveProperty("description");
    }
  });

  it("SEARCH_DEBOUNCE_MS is a reasonable debounce value", () => {
    expect(SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(100);
    expect(SEARCH_DEBOUNCE_MS).toBeLessThanOrEqual(1000);
  });

  it("COPY_FEEDBACK_MS is a reasonable feedback duration", () => {
    expect(COPY_FEEDBACK_MS).toBeGreaterThanOrEqual(500);
    expect(COPY_FEEDBACK_MS).toBeLessThanOrEqual(5000);
  });

  it("NOTIFICATION_POLL_INTERVAL_MS is at least 30 seconds", () => {
    expect(NOTIFICATION_POLL_INTERVAL_MS).toBeGreaterThanOrEqual(30_000);
  });

  it("ACTIVITY_ROTATION_MS is a reasonable rotation speed", () => {
    expect(ACTIVITY_ROTATION_MS).toBeGreaterThanOrEqual(2000);
    expect(ACTIVITY_ROTATION_MS).toBeLessThanOrEqual(10_000);
  });

  it("SHARE_POPUP dimensions are reasonable", () => {
    expect(SHARE_POPUP_WIDTH).toBeGreaterThanOrEqual(400);
    expect(SHARE_POPUP_WIDTH).toBeLessThanOrEqual(1200);
    expect(SHARE_POPUP_HEIGHT).toBeGreaterThanOrEqual(300);
    expect(SHARE_POPUP_HEIGHT).toBeLessThanOrEqual(900);
  });
});
