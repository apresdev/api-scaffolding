#! /usr/bin/env node

import * as path from "path";

import { program } from "commander";
import Handlebars = require("handlebars");

import { FileErrors, logErrors, toPascalCase } from "./common";
import { CodeGenerator } from "./generators/base";
import { EntityRelationshipGenerator } from "./generators/docs";
import { OpenAPIGenerator } from "./generators/openapi";
import { loadEntities } from "./models";
import { loadTemplateOpenAPISpecification } from "./spec";
import { ServiceSpecification, loadService } from "./specification";

Handlebars.registerHelper("toPascalCase", toPascalCase);

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Process the command line arguments.
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
program.name("generate").description("Generates a service implementation from a given service specification").version("0.0.1");

program
  .command("openapi")
  .description("Generates the OpenAPI specification")
  .argument("<spec_path>", "the path to the service specification")
  .option("-o, --outfile <path>", "output specification path", "openapi.json")
  .action(generateOpenApi);

program
  .command("docs")
  .description("Generates the ER and class diagrams")
  .argument("<spec_path>", "the path to the service specification")
  .action(generateDocs);

program.parse(process.argv);

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Commands.
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Runs the OpenAPI code generators.
 *
 * @param path  The path to the service specification.
 */
interface GenerateOpenApiOptions {
  outfile: string;
}
async function generateOpenApi(specPath: string, options: GenerateOpenApiOptions) {
  await generateService(specPath, new OpenAPIGenerator(path.dirname(specPath), options.outfile));
}

/**
 * Runs all documentation code generators.
 *
 * @param path  The path to the service specification.
 */
async function generateDocs(path: string) {
  await generateService(path, new EntityRelationshipGenerator());
}

/**
 * Loads the service specification and runs a collection of code generators.
 *
 * @param path        The path to the service specification.
 * @param generators  The code generators to run
 */
async function generateService(path: string, ...generators: Array<CodeGenerator>) {
  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Load the templates, service specifications, and schemas from the file system
  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  try {
    const results = new FileErrors();
    const openAPISpecification = loadTemplateOpenAPISpecification();

    const serviceDescriptor: ServiceSpecification = loadService(path, results);
    exitOnFailure(results);

    const entityMap = loadEntities(serviceDescriptor, results);
    exitOnFailure(results);

    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Run all of the code generators.
    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    generators.forEach((generator) => {
      generator.generate(serviceDescriptor, entityMap, openAPISpecification, results);
    });

    exitOnFailure(results);
  } catch (e) {
    if (typeof e === "string") {
      console.error(e);
    } else if (e instanceof Error) {
      console.error((e as Error).message);
    }
    process.exit(-1);
  }
}

function exitOnFailure(results: FileErrors) {
  if (results.hasErrors()) {
    logErrors(results).then(() => {
      process.exit(-1);
    });
  }
}
