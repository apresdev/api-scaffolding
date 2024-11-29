import { Objects } from "../../../src/common";
import { Constructor, describeUtilities } from "../../../src/common/base/test-utilities";

describe("Objects", () => {
  describeUtilities(Objects as never as Constructor<Objects>);

  describe("orEmpty", () => {
    it("should convert null into an empty object", () => {
      expect(Objects.orEmpty(null)).toStrictEqual({});
    });
    it("should convert undefined into an empty object", () => {
      expect(Objects.orEmpty(undefined)).toStrictEqual({});
    });
    it("should convert undefined into an empty object", () => {
      const input = { foo: "bar" };
      expect(Objects.orEmpty(input)).toBe(input);
    });
  });

  describe("orElse", () => {
    it("should use default value on null", () => {
      expect(Objects.orElse(null, "test")).toStrictEqual("test");
    });
    it("should use default value on undefined", () => {
      expect(Objects.orElse(undefined, "test")).toStrictEqual("test");
    });
    it("should use input value when defined", () => {
      const input = "foo";
      expect(Objects.orElse(input, "test")).toBe(input);
    });
  });

  describe("requireNonNull", () => {
    it("should throw an error on null", () => {
      expect(() => Objects.requireNonNull(null)).toThrow("value must not be null");
    });
    it("should throw an error on undefined", () => {
      expect(() => Objects.requireNonNull(undefined)).toThrow("value must not be null");
    });
    it("should convert undefined into an empty object", () => {
      const input = { foo: "bar" };
      expect(Objects.requireNonNull(input)).toBe(input);
    });
  });
});
