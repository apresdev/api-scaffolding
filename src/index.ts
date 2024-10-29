#! /usr/bin/env node

import { program } from "commander";
import Handlebars = require("handlebars");

import path from "node:path";
import { FileErrors, logErrors, toPascalCase } from "./common";
import { CodeGenerator } from "./generators/base";
import { EntityRelationshipGenerator } from "./generators/docs";
import { OpenAPIGenerator } from "./generators/openapi";
import { loadEntities } from "./models";
import { loadTemplateOpenAPISpecification } from "./spec";
import { ServiceSpecification, loadService } from "./specification";
import { version } from "./version";

Handlebars.registerHelper("toPascalCase", toPascalCase);

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Process the command line arguments.
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
program.name("api-scaffolding").description("Generates a service implementation from a given service specification").version(version);

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
  .action(generateDocumentation);

program.parse(process.argv);

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Commands.
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Runs the OpenAPI code generators.
 *
 * @param specPath  The path to the service specification.
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
 * @param specPath  The path to the service specification.
 */
async function generateDocumentation(specPath: string) {
  await generateService(specPath, new EntityRelationshipGenerator());
}

/**
 * Loads the service specification and runs a collection of code generators.
 *
 * @param specPath    The path to the service specification.
 * @param generators  The code generators to run
 */
async function generateService(specPath: string, ...generators: CodeGenerator[]) {
  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Load the templates, service specifications, and schemas from the file system
  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  try {
    const results = new FileErrors();
    const openAPISpecification = loadTemplateOpenAPISpecification();

    const serviceDescriptor: ServiceSpecification = loadService(specPath, results);
    await exitOnFailure(results);

    const entityMap = loadEntities(serviceDescriptor, results);
    await exitOnFailure(results);

    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Run all of the code generators.
    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    for (const generator of generators) {
      generator.generate(serviceDescriptor, entityMap, openAPISpecification, results);
    }

    await exitOnFailure(results);
  } catch (error) {
    /* eslint-disable no-console  */
    if (typeof error === "string") {
      console.error(error);
    } else if (error instanceof Error) {
      console.error((error as Error).message);
    }
    /* eslint-enable no-console  */
    process.exit(-1);
  }
}

async function exitOnFailure(results: FileErrors) {
  if (results.hasErrors()) {
    await logErrors(results);
    process.exit(-1);
  }
}
