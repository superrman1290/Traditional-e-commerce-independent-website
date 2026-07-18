import { describe, expect, it } from "vitest";
import AdminHomePage from "../app/page";

describe("admin home", () => {
  it("renders the stage 0 shell", () => {
    expect(AdminHomePage()).toBeTruthy();
  });
});

