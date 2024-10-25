import { Functions, Predicate, Supplier, Transform } from "../../../src/common";
import { Constructor, describeUtilities } from "../../../src/common/base/test-utilities";

describe("Functions", () => {
  describeUtilities(Functions as never as Constructor<Functions>);

  describe("compose", () => {
    const first = (s: string) => s.length;
    const second = (n: number) => n * 5;

    it("should fail on null inputs", () => {
      expect(() => Functions.compose(null as never as Transform<string, number>, second)).toThrow(
        "first compose function must not be null",
      );
      expect(() => Functions.compose(first, null as never as Transform<number, number>)).toThrow(
        "second compose function must not be null",
      );
      expect(() => Functions.compose(undefined as never as Transform<string, number>, second)).toThrow(
        "first compose function must not be null",
      );
      expect(() => Functions.compose(first, undefined as never as Transform<number, number>)).toThrow(
        "second compose function must not be null",
      );
    });

    it("should apply first then second", () => {
      const harness = Functions.compose(first, second);

      expect(harness("a")).toBe(5);
      expect(harness("ab")).toBe(10);
      expect(harness("abc")).toBe(15);
    });
  });

  describe("constant", () => {
    ["a", 1, { foo: "bar" }, null, undefined].forEach((input) => {
      describe(`Case: ${input}`, () => {
        it("should create a transformation function that returns the constant value", () => {
          const harness = Functions.constant(input);
          expect(harness("a")).toBe(input);
          expect(harness(1)).toBe(input);
        });
      });
    });
  });

  describe("forSupplier", () => {
    it("should fail on null or undefined supplier", () => {
      expect(() => Functions.forSupplier(null as never as Supplier<string>)).toThrow("supplier must not be null");
      expect(() => Functions.forSupplier(undefined as never as Supplier<string>)).toThrow("supplier must not be null");
    });
    ["a", 1, { foo: "bar" }, null, undefined].forEach((input) => {
      describe(`Case: ${input}`, () => {
        it("should create a transformation function that returns the supplier value", () => {
          const harness = Functions.forSupplier(() => input);
          expect(harness("a")).toBe(input);
          expect(harness(1)).toBe(input);
        });
      });
    });
  });

  describe("forPredicate", () => {
    it("should fail on null or undefined supplier", () => {
      expect(() => Functions.forPredicate(null as never as Predicate<string>)).toThrow("predicate must not be null");
      expect(() => Functions.forPredicate(undefined as never as Predicate<string>)).toThrow("predicate must not be null");
    });
    ["a", 1, { foo: "bar" }, null, undefined].forEach((input) => {
      describe(`Case: ${input}`, () => {
        it("should create a transformation function that returns the predicate output", () => {
          const harness = Functions.forPredicate((s: string) => s.length == 0);
          expect(harness("a")).toBe(false);
          expect(harness("")).toBe(true);
        });
      });
    });
  });

  describe("forMap", () => {
    const map = new Map<string, number>();
    map.set("foo", 123);
    map.set("bar", 456);

    it("should fail on null or undefined supplier", () => {
      expect(() => Functions.forMap(null as never as Map<string, string>)).toThrow("map must not be null");
      expect(() => Functions.forMap(undefined as never as Map<string, string>)).toThrow("map must not be null");
    });

    it("should create a transformation function that returns the value from the map", () => {
      const harness = Functions.forMap(map);
      expect(harness("foo")).toBe(123);
      expect(harness("bar")).toBe(456);
    });

    it("should throw an error if key does not exists and no default value supplier is given", () => {
      const harness = Functions.forMap(map);
      expect(() => harness("baz")).toThrow("no value at given key baz");
    });

    it("should call the default value supplier if key does not exists", () => {
      const harness = Functions.forMap(map, () => 789);
      expect(harness("baz")).toBe(789);
    });

    it("should use the default value  if key does not exists", () => {
      const harness = Functions.forMap(map, 789);
      expect(harness("baz")).toBe(789);
    });
  });
});

describe("forRecord", () => {
  const map: Record<string, number> = {
    foo: 123,
    bar: 456,
  };

  it("should fail on null or undefined supplier", () => {
    expect(() => Functions.forMap(null as never as Map<string, string>)).toThrow("map must not be null");
    expect(() => Functions.forMap(undefined as never as Map<string, string>)).toThrow("map must not be null");
  });

  it("should create a transformation function that returns the value from the map", () => {
    const harness = Functions.forRecord(map);
    expect(harness("foo")).toBe(123);
    expect(harness("bar")).toBe(456);
  });

  it("should throw an error if key does not exists and no default value supplier is given", () => {
    const harness = Functions.forRecord(map);
    expect(() => harness("baz")).toThrow("no value at given key baz");
  });

  it("should call the default value supplier if key does not exists", () => {
    const harness = Functions.forRecord(map, () => 789);
    expect(harness("baz")).toBe(789);
  });

  it("should use the default value  if key does not exists", () => {
    const harness = Functions.forRecord(map, 789);
    expect(harness("baz")).toBe(789);
  });
});

describe("identity", () => {
  it("should create a transformation function that returns the supplied value", () => {
    const harness = Functions.identity();
    ["a", 1, { foo: "bar" }, null, undefined].forEach((input) => {
      expect(harness(input)).toBe(input);
    });
  });
});

describe("toString", () => {
  it("should create a transformation function that throws an error on null or undefined input", () => {
    const harness = Functions.toString();
    expect(() => harness(null)).toThrow("toString input must not be null");
    expect(() => harness(undefined)).toThrow("toString input must not be null");
  });

  it("should create a transformation function that returns the toString value", () => {
    const harness = Functions.toString();
    ["a", 1, { foo: "bar" }].forEach((input) => {
      expect(harness(input)).toBe(input?.toString());
    });
  });
});
