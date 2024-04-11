import "jest";

import { Suppliers } from "../../../src/common";

describe("Suppliers", () => {
  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // of()
  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("of", () => {
    it("should return the same instance that is given", () => {
      ["abc", 1, true, { foo: "bar" }, [1, 2, 3], null, undefined].forEach((value) => {
        const supplier = Suppliers.of(value);
        expect(supplier()).toBe(value);
      });
    });
  });

  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // memoize()
  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("memoize", () => {
    it("should return the value from the delegate", () => {
      ["abc", 1, true, { foo: "bar" }, [1, 2, 3], null, undefined].forEach((value) => {
        const supplier = Suppliers.memoize(Suppliers.of(value));
        expect(supplier()).toBe(value);
      });
    });

    it("should only call the delegate supplier once.", () => {
      const delegate = jest.fn();
      const supplier = Suppliers.memoize(delegate);
      supplier();
      supplier();
      supplier();
      expect(delegate).toHaveBeenCalledTimes(1);
    });

    it("should fail on null or undefined delegate", () => {
      [null, undefined].forEach((delegate) => {
        expect(() => Suppliers.memoize<unknown>(delegate as never)).toThrow("delegate must not be null");
      });
    });
  });

  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // compose()
  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("compose", () => {
    it("should apply the transformation to the supplied value", () => {
      const input = "foo";
      const expected = "FOO";

      const supplier = Suppliers.compose((value: string): string => value.toUpperCase(), Suppliers.of(input));
      const result = supplier();

      expect(result).toBe(expected);
    });

    it("should fail on null or undefined transform", () => {
      [null, undefined].forEach((transform) => {
        expect(() => Suppliers.compose(transform as never, Suppliers.of("X"))).toThrow("transform must not be null");
      });
    });
    it("should fail on null or undefined delegate", () => {
      [null, undefined].forEach((delegate) => {
        expect(() => Suppliers.compose(() => "foo", delegate as never)).toThrow("delegate must not be null");
      });
    });
  });
});
