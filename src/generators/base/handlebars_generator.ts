import * as fs from "fs";

import Handlebars = require("handlebars");

import { CodeGenerator } from "./code_generator";

import { ServiceSpecification } from "../../specification";

export abstract class HandlebarsGenerator implements CodeGenerator {
  private readonly paths: Array<string>;

  constructor(paths: Array<string>) {
    this.paths = paths;
  }

  public generate(service: ServiceSpecification) {
    this.paths.forEach((path) => {
      const template = Handlebars.compile(fs.readFileSync(`src/generators/${path}.handlebars`).toString());
      const contents = template(service);
      fs.writeFileSync(path, contents, "utf8");
    });
  }
}
