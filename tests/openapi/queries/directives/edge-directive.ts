import "jest";

import { EdgeDirective } from "../../../../src/generators/openapi/queries/directives";
import { Edge, RelationshipName } from "../../../../src/specification";

describe("EdgeDirective", () => {
  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // of()
  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe("constructor", () => {
    it("should fail on null or undefined source", () => {
      [null, undefined].forEach((source) => {
        expect(() => new EdgeDirective(source as never as RelationshipName, {} as Edge)).toThrow(
          "value was not non-null. source must not be empty",
        );
      });
    });
    it("should fail on null or undefined source", () => {
      expect(() => new EdgeDirective("", {} as Edge)).toThrow("source must not be empty");
    });
    it("should fail on null or undefined edge", () => {
      [null, undefined].forEach((edge) => {
        expect(() => new EdgeDirective("source", edge as never as Edge)).toThrow("edge must not be null");
      });
    });
  });
});
