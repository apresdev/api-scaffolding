import path from "path";
import {
  aOrAn,
  oxfordJoin,
  pluralize,
  singularize,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
  toTitleCase,
} from "../../../src/common";
import { loadYaml } from "../../../src/util";
/**
 * Defines the interface for an externalized simple test case
 */
interface TestCase<I, O> {
  name?: string;
  input: I;
  expected: O;
}

interface ExpectedCases {
  titleCase: string;
  snakeCase: string;
  kebabCase: string;
  camelCase: string;
  pascalCase: string;
}

export function testDataFolder(...folders: string[]): string {
  return path.resolve("test/testdata/", ...folders);
}

describe("String Helpers", () => {
  describe("oxfordJoin", () => {
    ["and", "or"].forEach((conjunction) => {
      describe(conjunction, () => {
        it("should return a empty string on no terms", () => {
          expect(oxfordJoin([], conjunction as "and" | "or")).toBe("");
        });

        it("should return a single term as is", () => {
          expect(oxfordJoin(["test"], conjunction as "and" | "or")).toBe("test");
        });

        it("should return joined with no commas on two terms as is", () => {
          expect(oxfordJoin(["a", "b"], conjunction as "and" | "or")).toBe(`a ${conjunction} b`);
        });

        it("should return joined, with the oxford command on more than two terms", () => {
          expect(oxfordJoin(["a", "b", "c"], conjunction as "and" | "or")).toBe(`a, b, ${conjunction} c`);
        });
      });
    });
  });

  describe("aOrAn", () => {
    const testCases: Array<TestCase<string, string>> = loadYaml(testDataFolder("string-helpers", "a-or-an.yaml"));

    it(`should return "a" on null or empty input`, () => {
      expect(aOrAn(undefined as never as string)).toBe("a");
      expect(aOrAn(null as never as string)).toBe("a");
      expect(aOrAn("")).toBe("a");
    });

    testCases.forEach((testCase) => {
      it(testCase.name || `${testCase.input} should produce ${testCase.expected}`, () => {
        expect(aOrAn(testCase.input)).toBe(testCase.expected);
      });
    });
  });

  describe("Case Formats", () => {
    const testCases: Array<TestCase<string, ExpectedCases>> = loadYaml(testDataFolder("string-helpers", "case-formats.yaml"));

    describe("toCamelCase", () => {
      it("should return undefined on undefied", () => {
        expect(toCamelCase(undefined)).toBe("undefined");
      });

      testCases.forEach((testCase) => {
        it(`${testCase.input} should produce ${testCase.expected.camelCase}`, () => {
          expect(toCamelCase(testCase.input)).toBe(testCase.expected.camelCase);
        });
      });
    });

    describe("toPascalCase", () => {
      it("should return undefined on undefied", () => {
        expect(toPascalCase(undefined)).toBe("Undefined");
      });

      testCases.forEach((testCase) => {
        it(`${testCase.input} should produce ${testCase.expected.pascalCase}`, () => {
          expect(toPascalCase(testCase.input)).toBe(testCase.expected.pascalCase);
        });
      });
    });

    describe("toTitleCase", () => {
      it("should return undefined on undefied", () => {
        expect(toTitleCase(undefined)).toBe("Undefined");
      });

      testCases.forEach((testCase) => {
        it(`${testCase.input} should produce ${testCase.expected.titleCase}`, () => {
          expect(toTitleCase(testCase.input)).toBe(testCase.expected.titleCase);
        });
      });
    });

    describe("toKebabCase", () => {
      it("should return undefined on undefied", () => {
        expect(toKebabCase(undefined)).toBe("undefined");
      });

      testCases.forEach((testCase) => {
        it(`${testCase.input} should produce ${testCase.expected.kebabCase}`, () => {
          expect(toKebabCase(testCase.input)).toBe(testCase.expected.kebabCase);
        });
      });
    });

    describe("toSnakeCase", () => {
      it("should return undefined on undefied", () => {
        expect(toSnakeCase(undefined)).toBe("undefined");
      });

      testCases.forEach((testCase) => {
        it(`${testCase.input} should produce ${testCase.expected.snakeCase}`, () => {
          expect(toSnakeCase(testCase.input)).toBe(testCase.expected.snakeCase);
        });
      });
    });
  });

  describe("pluralize", () => {
    const testCases: Array<TestCase<string, string>> = loadYaml(testDataFolder("string-helpers", "pluralize.yaml"));

    it("should return undefined on undefied", () => {
      expect(pluralize(undefined)).toBe("undefined");
    });

    testCases.forEach((testCase) => {
      it(testCase.name || `${testCase.input} should produce ${testCase.expected}`, () => {
        expect(pluralize(testCase.input)).toBe(testCase.expected);
      });
    });
  });

  describe("singularize", () => {
    const testCases: Array<TestCase<string, string>> = loadYaml(testDataFolder("string-helpers", "pluralize.yaml"));

    it("should return undefined on undefied", () => {
      expect(singularize(undefined)).toBe("undefined");
    });

    testCases.forEach((testCase) => {
      it(`${testCase.expected} should produce ${testCase.input}`, () => {
        expect(singularize(testCase.expected)).toBe(testCase.input);
      });
    });
  });
});
