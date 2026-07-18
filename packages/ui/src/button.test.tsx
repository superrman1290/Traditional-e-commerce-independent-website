import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("creates a button element", () => {
    const element = Button({ children: "保存" });

    expect(element.type).toBe("button");
    expect(element.props.children).toBe("保存");
  });
});

