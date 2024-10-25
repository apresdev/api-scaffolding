import { isIncludeDirective } from "../../src/specification/include";

describe("isIncludeDirective", () => {
  it("should return false on null or undefined input", () => {
    expect(isIncludeDirective(null)).toBe(false);
    expect(isIncludeDirective(undefined)).toBe(false);
  });
  it("should return false on non-object", () => {
    expect(isIncludeDirective("test")).toBe(false);
    expect(isIncludeDirective(123)).toBe(false);
    expect(isIncludeDirective(true)).toBe(false);
    expect(isIncludeDirective(["foo", "bar"])).toBe(false);
  });
  it("should return false on object without the $include key", () => {
    expect(isIncludeDirective({ foo: "bar" })).toBe(false);
  });
  it("should return true on object with a single $include key", () => {
    expect(isIncludeDirective({ $include: "bar" })).toBe(true);
  });
  it("should return true on object with a multiple keys and a $include key", () => {
    expect(isIncludeDirective({ $include: "bar", foo: "baz" })).toBe(false);
  });
});
