import { describe, expect, it } from "vitest";
import { getRuntimeConfig } from "./index";

describe("getRuntimeConfig", () => {
  it("uses defaults for local development", () => {
    const config = getRuntimeConfig({});

    expect(config.apiPort).toBe(4000);
    expect(config.apiUrl).toBe("http://localhost:4000");
    expect(config.adminUrl).toBe("http://localhost:3001");
    expect(config.storefrontUrl).toBe("http://localhost:3000");
  });
});

