import { describe, it, expect } from "vitest";
import { logger, createLogger } from "../logger";

describe("logger", () => {
  it("exports a pino logger instance", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("createLogger returns a child logger with module context", () => {
    const child = createLogger("test-module");
    expect(child).toBeDefined();
    expect(typeof child.info).toBe("function");
    expect(typeof child.error).toBe("function");
  });

  it("child loggers retain parent log methods", () => {
    const child = createLogger("orders");
    // child should have all standard pino methods
    expect(typeof child.fatal).toBe("function");
    expect(typeof child.trace).toBe("function");
    expect(typeof child.child).toBe("function");
  });
});
