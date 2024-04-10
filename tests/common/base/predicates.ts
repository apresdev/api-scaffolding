import "jest";

import { Predicates } from "../../../src/common";

describe("Predicates", () => {
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // and()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("and", () => {
    it("should return the AND of all inner predicates ", () => {
      const alwaysTrue = Predicates.alwaysTrue();
      const alwaysFalse = Predicates.alwaysFalse();

      expect(Predicates.and(alwaysTrue, alwaysTrue, alwaysTrue)("test")).toBe(true);
      expect(Predicates.and(alwaysTrue, alwaysFalse, alwaysTrue)("test")).toBe(false);
      expect(Predicates.and(alwaysFalse, alwaysTrue, alwaysTrue)("test")).toBe(false);
      expect(Predicates.and(alwaysFalse, alwaysFalse, alwaysTrue)("test")).toBe(false);
      expect(Predicates.and(alwaysTrue, alwaysTrue, alwaysFalse)("test")).toBe(false);
      expect(Predicates.and(alwaysTrue, alwaysFalse, alwaysFalse)("test")).toBe(false);
      expect(Predicates.and(alwaysFalse, alwaysTrue, alwaysFalse)("test")).toBe(false);
      expect(Predicates.and(alwaysFalse, alwaysFalse, alwaysFalse)("test")).toBe(false);
    });

    it("should fail on an empty arguments ", () => {
      expect(() => Predicates.and()).toThrow("predicates must not be empty");
    });

    it("should fail on null or undefined input", () => {
      [null, undefined].forEach((predicate) => {
        expect(() => Predicates.and(predicate as never)).toThrow("predicates must not be null");
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // or()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("or", () => {
    it("should return the AND of all inner predicates ", () => {
      const alwaysTrue = Predicates.alwaysTrue();
      const alwaysFalse = Predicates.alwaysFalse();

      expect(Predicates.or(alwaysTrue, alwaysTrue, alwaysTrue)("test")).toBe(true);
      expect(Predicates.or(alwaysTrue, alwaysFalse, alwaysTrue)("test")).toBe(true);
      expect(Predicates.or(alwaysFalse, alwaysTrue, alwaysTrue)("test")).toBe(true);
      expect(Predicates.or(alwaysFalse, alwaysFalse, alwaysTrue)("test")).toBe(true);
      expect(Predicates.or(alwaysTrue, alwaysTrue, alwaysFalse)("test")).toBe(true);
      expect(Predicates.or(alwaysTrue, alwaysFalse, alwaysFalse)("test")).toBe(true);
      expect(Predicates.or(alwaysFalse, alwaysTrue, alwaysFalse)("test")).toBe(true);
      expect(Predicates.or(alwaysFalse, alwaysFalse, alwaysFalse)("test")).toBe(false);
    });

    it("should fail on an empty arguments ", () => {
      expect(() => Predicates.or()).toThrow("predicates must not be empty");
    });

    it("should fail on null or undefined input", () => {
      [null, undefined].forEach((predicate) => {
        expect(() => Predicates.or(predicate as never)).toThrow("predicates must not be null");
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // not()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("not", () => {
    it("should create a predicate that returns the opposite of the supplied predicate", () => {
      [true, false].forEach((result) => {
        const predicate = Predicates.not(() => result);
        expect(predicate("test")).toBe(!result);
      });
    });

    it("should fail on null or undefined input", () => {
      [null, undefined].forEach((predicate) => {
        expect(() => Predicates.not(predicate as never)).toThrow("predicate must not be null");
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // alwaysTrue()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("alwaysTrue", () => {
    it("should create a predicate that always return true, regardless of input", () => {
      [true, false, "X", 1, { foo: "bar" }, [1, 2, 3], null, undefined].forEach((input) => {
        const expected = true;
        const predicate = Predicates.alwaysTrue();
        expect(predicate(input)).toBe(expected);
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // alwaysFalse()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("alwaysFalse", () => {
    it("should create a predicate that always return true, regardless of input", () => {
      [true, false, "X", 1, { foo: "bar" }, [1, 2, 3], null, undefined].forEach((input) => {
        const expected = false;
        const predicate = Predicates.alwaysFalse();
        expect(predicate(input)).toBe(expected);
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // notNull()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("notNull", () => {
    it("should create a predicate that always return true, when the value is not null or undefined", () => {
      [true, false, "X", 1, { foo: "bar" }, [1, 2, 3]].forEach((input) => {
        const expected = true;
        const predicate = Predicates.notNull();
        expect(predicate(input)).toBe(expected);
      });
    });

    it("should create a predicate that always return false when the value is null or undefined", () => {
      [null, undefined].forEach((input) => {
        const expected = false;
        const predicate = Predicates.notNull();
        expect(predicate(input)).toBe(expected);
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // notEmpty()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("notEmpty", () => {
    it("should create a predicate that always return true when the value is an non-empty string", () => {
      const input = "X";
      const expected = true;
      const predicate = Predicates.notEmpty();
      expect(predicate(input)).toBe(expected);
    });

    it("should create a predicate that always return true when the value is an non-empty array", () => {
      const input = [1];
      const expected = true;
      const predicate = Predicates.notEmpty();
      expect(predicate(input)).toBe(expected);
    });

    it("should create a predicate that always return false when the value is an empty array", () => {
      const input = [];
      const expected = false;
      const predicate = Predicates.notEmpty();
      expect(predicate(input)).toBe(expected);
    });

    it("should create a predicate that always return false when the value is an empty string", () => {
      const input = "";
      const expected = false;
      const predicate = Predicates.notEmpty();
      expect(predicate(input)).toBe(expected);
    });

    it("should create a predicate that always return false when the value is null or undefined", () => {
      [null, undefined].forEach((input) => {
        const expected = false;
        const predicate = Predicates.notEmpty();
        expect(predicate(input as never)).toBe(expected);
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // isString()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("isString", () => {
    it("should create a predicate that always return true when the value is a string", () => {
      ["", "X", "123"].forEach((input) => {
        const expected = true;
        const predicate = Predicates.isString();
        expect(predicate(input)).toBe(expected);
      });
    });

    it("should create a predicate that always return value when the value is not a string", () => {
      [1, true, { foo: "bar" }, [1, 2, 3], null, undefined].forEach((input) => {
        const expected = false;
        const predicate = Predicates.isString();
        expect(predicate(input)).toBe(expected);
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // isArray()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("isArray", () => {
    it("should create a predicate that always return true when the value is an array", () => {
      [[], ["X"], [1, 2, 3]].forEach((input) => {
        const expected = true;
        const predicate = Predicates.isArray();
        expect(predicate(input)).toBe(expected);
      });
    });

    it("should create a predicate that always return value when the value is not a string", () => {
      ["X", 1, true, { foo: "bar" }, null, undefined].forEach((input) => {
        const expected = false;
        const predicate = Predicates.isArray();
        expect(predicate(input)).toBe(expected);
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // isArray()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("isArray", () => {
    it("should create a predicate that always return true when the value is an array", () => {
      [[], ["X"], [1, 2, 3]].forEach((input) => {
        const expected = true;
        const predicate = Predicates.isArray();
        expect(predicate(input)).toBe(expected);
      });
    });

    it("should create a predicate that always return value when the value is not a string", () => {
      ["X", 1, true, { foo: "bar" }, null, undefined].forEach((input) => {
        const expected = false;
        const predicate = Predicates.isArray();
        expect(predicate(input)).toBe(expected);
      });
    });
  });

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // isArray()
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("eachArrayItem", () => {
    it("should create a predicate that returns true if each item in the array matches the predicate", () => {
      const input = ["a", "b", "c", "d"];
      const expected = true;
      const predicate = Predicates.eachArrayItem(Predicates.isString());
      expect(predicate(input)).toBe(expected);
    });

    it("should create a predicate that returns false if any item in the array does not matches the predicate", () => {
      const input = ["a", "b", "c", "d"];
      const expected = false;
      const predicate = Predicates.eachArrayItem(Predicates.isString());

      for (let index = 0; index < input.length; index++) {
        const copy: Array<string | number> = [...input];
        copy[index] = 1;

        expect(predicate(copy)).toBe(expected);
      }
    });

    it("should create a predicate that returns false on null or undefined predicate", () => {
      const predicate = Predicates.eachArrayItem(Predicates.isString());
      [null, undefined].forEach((input) => {
        const expected = false;
        expect(predicate(input as never)).toBe(expected);
      });
    });

    it("should create a predicate that returns false on null or undefined predicate", () => {
      const predicate = Predicates.eachArrayItem(Predicates.isString());
      [true, 0, "X", { foo: "bar" }].forEach((input) => {
        const expected = false;
        expect(predicate(input as never)).toBe(expected);
      });
    });

    it("should fail on null or undefined predicate", () => {
      [null, undefined].forEach((predicate) => {
        expect(() => Predicates.eachArrayItem(predicate as never)).toThrow("predicate must not be null");
      });
    });
  });
});
