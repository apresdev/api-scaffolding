import "jest";

import { lstatSync, mkdtempSync, readdirSync, rmSync } from "fs";
import path from "path";
import { FileErrors, logErrors, ProcessingErrors } from "../../src/common";
import { OpenAPIGenerator } from "../../src/generators/openapi";
import { loadEntities, loadFiles } from "../../src/models";
import { loadTemplateOpenAPISpecification } from "../../src/spec";
import { loadService } from "../../src/specification";
import { loadYaml } from "../../src/util";

const testDataDirectory = "test/testdata";
const specificationDirectory = `${testDataDirectory}/e2e/specs`;
const successModeDirectory = `${specificationDirectory}/succeded`;
const failureModeDirectory = `${specificationDirectory}/failed`;

function successPath(item: string): string {
  return `${successModeDirectory}/${item}`;
}
function failurePath(item: string): string {
  return `${failureModeDirectory}/${item}`;
}

async function exitOnFailure(results: FileErrors) {
  if (results.hasErrors()) {
    await logErrors(results);
    fail("expected no processing error");
  }
}

function checkErrors(results: FileErrors, expected: Record<string, ProcessingErrors>): boolean {
  if (results.hasErrors()) {
    const actual = results.errors();

    // Ensure that every actual error matches an expected error.
    Object.keys(actual).forEach((absolutePath) => {
      // Lookup the expected errors for the absolute path.
      const expectedErrors = Object.keys(expected)
        .filter((relative) => absolutePath.endsWith(relative))
        .map((relative) => expected[relative])[0];

      expect(expectedErrors).toBeDefined();

      // Compare the errors, I don't care about ordering of errorsnb
      const actualErrors = actual[absolutePath];
      for (const expectedError of expectedErrors) {
        expect(actualErrors).toContainEqual(expectedError);
      }
      expect(actualErrors.length).toBe(expectedErrors.length);
    });

    // Ensure that every expected error path occurred
    Object.keys(expected).forEach((relative) => {
      // Lookup the expected errors for the absolute path.
      const actualErrors = Object.keys(actual).filter((absolutePath) => absolutePath.endsWith(relative))[0];

      expect(actualErrors).toBeDefined();
    });
  }

  return results.hasErrors();
}

describe("End to End Tests", () => {
  let outputPath;

  beforeAll(() => {
    outputPath = mkdtempSync("tmp/e2e");
  });

  afterAll(() => {
    rmSync(outputPath, { recursive: true, force: true });
  });

  // // TODO: Delete this test
  // it("should handle clearsight", async () => {
  //   const results = new FileErrors();
  //   const specPath = "/home/emdean/projects/clearsight/backend/api/service/service.yaml";
  //   const openAPISpecification = loadTemplateOpenAPISpecification();

  //   const serviceDescriptor = loadService(specPath, results);
  //   await exitOnFailure(results);

  //   const schemaRegistry = loadEntities(serviceDescriptor, results);
  //   await exitOnFailure(results);

  //   const outputFile = "/home/emdean/projects/clearsight/backend/openapi.json";
  //   const generator = new OpenAPIGenerator(specificationDirectory, outputFile);

  //   await generator.generate(serviceDescriptor, schemaRegistry, openAPISpecification, results, true);
  //   await exitOnFailure(results);
  // });

  describe("Success Modes", () => {
    readdirSync(successModeDirectory)
      .filter((item) => lstatSync(successPath(item)).isFile())
      .forEach((item) => {
        describe(item, () => {
          it("should produce expected specification", async () => {
            const results = new FileErrors();
            const specPath = successPath(item);
            const openAPISpecification = loadTemplateOpenAPISpecification();

            const serviceDescriptor = loadService(specPath, results);
            await exitOnFailure(results);

            const schemaRegistry = loadEntities(serviceDescriptor, results);
            await exitOnFailure(results);

            loadFiles(serviceDescriptor, schemaRegistry, results);
            await exitOnFailure(results);

            const outputFile = path.resolve(`${outputPath}/${item}`);
            const generator = new OpenAPIGenerator(specificationDirectory, outputFile);

            await generator.generate(serviceDescriptor, schemaRegistry, openAPISpecification, results, true);
            await exitOnFailure(results);

            const output = loadYaml(outputFile);
            const expected = loadYaml(`${successModeDirectory}/expected/${item}`);

            expect(output).toStrictEqual(expected);
          });
        });
      });
  });

  describe("Failure Modes", () => {
    readdirSync(failureModeDirectory)
      .filter((item) => lstatSync(failurePath(item)).isFile())
      .forEach((item) => {
        describe(item, () => {
          it("should produce expected errors", async () => {
            const results = new FileErrors();
            const specPath = failurePath(item);
            const openAPISpecification = loadTemplateOpenAPISpecification();
            const expected: Record<string, ProcessingErrors> = loadYaml(`${failureModeDirectory}/expected_errors/${item}`);

            const serviceDescriptor = loadService(specPath, results);
            if (checkErrors(results, expected)) {
              return;
            }

            const schemaRegistry = loadEntities(serviceDescriptor, results);
            if (checkErrors(results, expected)) {
              return;
            }

            const outputFile = path.resolve(`${outputPath}/${item}`);
            const generator = new OpenAPIGenerator(specificationDirectory, outputFile);

            await generator.generate(serviceDescriptor, schemaRegistry, openAPISpecification, results, true);
            expect(results.hasErrors()).toBe(true);
            checkErrors(results, expected);
          });
        });
      });
  });
});
