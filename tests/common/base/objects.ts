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
