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
});
