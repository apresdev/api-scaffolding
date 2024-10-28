import { Arrays } from "../../../src/common";
import { Constructor, describeUtilities } from "../../../src/common/base/test-utilities";

describe("Arrays", () => {
  describeUtilities(Arrays as never as Constructor<Arrays>);

  describe("orEmpty", () => {
    it("should convert null into an empty array", () => {
      expect(Arrays.orEmpty(null)).toStrictEqual([]);
    });
    it("should convert undefined into an empty array", () => {
      expect(Arrays.orEmpty(undefined)).toStrictEqual([]);
    });
    it("should convert undefined into an empty array", () => {
      const input = ["foo", "bar"];
      expect(Arrays.orEmpty(input)).toBe(input);
    });
  });
});
