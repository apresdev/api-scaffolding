import { Document, ISpectralDiagnostic, Ruleset, Spectral } from "@stoplight/spectral-core";
import { oas3 } from "@stoplight/spectral-formats";
import { stylish } from "@stoplight/spectral-formatters";
import { Json } from "@stoplight/spectral-parsers";
import { oas } from "@stoplight/spectral-rulesets";
import { DiagnosticSeverity } from "@stoplight/types";
import { OpenAPISpecification } from "../types";
import { adSensitiveParameterCheck } from "./functions";

/**
 * Lints the OpenAPI specification using our preferred rule set, then dumps the linting results to the console using the `stylish` format.
 *
 * @param spec      The OpenAPI specficiation.
 * @param outfile   The output file location.
 * @returns
 */
export async function lintSpecification(spec: OpenAPISpecification, outfile: string): Promise<boolean> {
  const results = await runSpectral(initializeSpectral(), spec, outfile);

  dumpResults(results);

  return results.length === 0;
}

/**
 * Initializes the spectral instance using our preferred rule set.
 *
 * Our preferred rule set extends the OpenAPI ruleset provided by spectral and includes additional rules to:
 * - Detect sensitive data in the URL.
 *
 * @returns The initialized spectral instance.
 */
function initializeSpectral(): Spectral {
  const spectral = new Spectral();
  spectral.setRuleset({
    extends: [oas as unknown as Ruleset],
    formats: [oas3],
    aliases: {
      PathItem: ["$.paths[*]"],
      OperationObject: ["#PathItem[get,put,post,delete,options,head,patch,trace]"],
    },
    rules: {
      "ad-no-sensitive-data-in-url": {
        severity: "error",
        given: "#OperationObject",
        then: {
          function: adSensitiveParameterCheck,
        },
      },
    },
  });

  return spectral;
}

/**
 * Lints the OpenAPI specification against the given spectral instance.
 *
 * @param spectral  The spectral instance.
 * @param spec      The OpenAPI specficiation.
 * @param outfile   The output file location.
 * @returns the linting results.
 */
async function runSpectral(spectral: Spectral, spec: OpenAPISpecification, outfile: string): Promise<ISpectralDiagnostic[]> {
  const document = new Document(JSON.stringify(spec, null, 2), Json, outfile);
  return await spectral.run(document);
}

/**
 * Dumps the linting results to the console using the `stylish` format.
 *
 * @param results The linting results.
 */
function dumpResults(results: ISpectralDiagnostic[]) {
  console.log(
    stylish(results, {
      failSeverity: DiagnosticSeverity.Warning,
    }),
  );
}
