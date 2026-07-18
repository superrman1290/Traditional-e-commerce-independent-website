import { describe, expect, it } from "vitest";
import { createServiceHealth } from "./index";

describe("createServiceHealth", () => {
  it("creates a typed ok response", () => {
    const health = createServiceHealth("api");

    expect(health.status).toBe("ok");
    expect(health.service).toBe("api");
    expect(Date.parse(health.timestamp)).not.toBeNaN();
  });
});

