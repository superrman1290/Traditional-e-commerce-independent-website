import { describe, expect, it } from "vitest";
import StorefrontHomePage from "../app/page";

describe("storefront home", () => {
  it("exports the storefront catalog shell", () => {
    expect(typeof StorefrontHomePage).toBe("function");
  });
});
