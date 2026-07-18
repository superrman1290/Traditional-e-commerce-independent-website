import { describe, expect, it } from "vitest";
import { databasePackageName } from "./index";

describe("database package", () => {
  it("exposes its package name", () => {
    expect(databasePackageName).toBe("@ecommerce/database");
  });
});

