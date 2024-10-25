import { sanitizeOpenAPI } from "../../../src/generators/openapi/preprocess";
import { OpenAPISpecification } from "../../../src/generators/openapi/types";

describe("sanitizeOpenAPI", () => {
  it("should", () => {
    const input: OpenAPISpecification = {} as never as OpenAPISpecification;

    expect(input.paths).not.toBeDefined();
    expect(input.components).not.toBeDefined();

    sanitizeOpenAPI(input);

    expect(input.paths).toBeDefined();
    expect(input.components).toBeDefined();
    expect(input.components?.parameters).toBeDefined();
    expect(input.components?.requestBodies).toBeDefined();
    expect(input.components?.requestBodies).toBeDefined();
  });
});
