import { describe, expect, it } from "vitest";
import StorefrontHomePage from "../app/page";

describe("storefront home", () => {
  it("renders the stage 0 shell", () => {
    expect(StorefrontHomePage()).toBeTruthy();
  });
});

