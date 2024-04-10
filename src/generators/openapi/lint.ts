import * as fs from "fs";
import { join } from "path";

import { Document, Spectral } from "@stoplight/spectral-core";
import { FormatterOptions, stylish } from "@stoplight/spectral-formatters";
import { Json } from "@stoplight/spectral-parsers";
import { bundleAndLoadRuleset } from "@stoplight/spectral-ruleset-bundler/with-loader";
import { DiagnosticSeverity } from "@stoplight/types";

import { OpenAPISpecification } from "./types";

export async function lintSpecification(spec: OpenAPISpecification, outfile: string): Promise<boolean> {
  const document = new Document(JSON.stringify(spec, null, 2), Json, outfile);
  const spectral = new Spectral();
  const rulesetFilepath = join(__dirname, "../../../", ".spectral.yaml");
  spectral.setRuleset(await bundleAndLoadRuleset(rulesetFilepath, { fs, fetch }));

  const results = await spectral.run(document);
  const opts: FormatterOptions = {
    failSeverity: DiagnosticSeverity.Warning,
  };

  const output = stylish(results, opts);
  console.log(output);

  return results.length === 0;
}
