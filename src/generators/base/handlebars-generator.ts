import { readFileSync, writeFileSync } from "node:fs";

import Handlebars = require("handlebars");

import { CodeGenerator } from "./code-generator";

import { ServiceSpecification } from "../../specification";

export abstract class HandlebarsGenerator implements CodeGenerator {
  private readonly paths: string[];

  constructor(paths: string[]) {
    this.paths = paths;
  }

  public generate(service: ServiceSpecification) {
    for (const path of this.paths) {
      const template = Handlebars.compile(readFileSync(`src/generators/${path}.handlebars`).toString());
      const contents = template(service);
      writeFileSync(path, contents, "utf8");
    }
  }
}
