import { describe, expect, it } from "vitest";
import AdminHomePage from "../app/page";

describe("admin home", () => {
  it("exports the admin catalog shell", () => {
    expect(typeof AdminHomePage).toBe("function");
  });
});
