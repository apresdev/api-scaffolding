import { existsSync } from "node:fs";
import path from "node:path";

import { FileErrors, SchemaValidator, SourceMaps } from "../../common";
import { FileProcessor, FileProcessorContext, PathError } from "../../common/io";
import { PathProcessor } from "../../common/io/path-processor";

import { Fragment, Fragments, IncludeDirective, ObjectSchema, isIncludeDirective } from "../../specification";
import { EntityProjections, Joins } from "../../specification/joins";
import { QueryProcessorContext } from "./queries/query-generator";
import { asArray } from "./util";

/* eslint-disable import/no-namespace */
import * as fragmentsSchema from "../../schemas/fragments.json";
/* eslint-enable import/no-namespace */

const validator = new SchemaValidator<Fragments>(fragmentsSchema, new SourceMaps());

/**
 * Processes a collection of Query definitions.
 */
export class FragmentsProcessor extends FileProcessor<Fragments, QueryProcessorContext> {
  /**
   * Creates an instance of a QueriesProcessor.
   *
   * @param basePath    The base path when resolving relative path references.
   * @param fileErrors  The collector of file processing errors.
   */
  public constructor(fileErrors: FileErrors) {
    super(validator, fileErrors);
  }

  /**
   * Processes a collection of Query nodes.
   *
   * @param fragments The collection of Query's to process.
   * @param context The execution context.
   */
  public processModel(fragments: Fragments, context: FileProcessorContext<QueryProcessorContext>): void {
    for (const [index, fragment] of fragments.entries()) {
      try {
        // Check to see if the query is actually a $include directive...
        if (isIncludeDirective(fragment)) {
          // ... if it is, then process the include directive.
          this.processInclude(fragment as IncludeDirective, {
            ...context,
            jsonPath: String(index),
          });
        } else {
          // ... otherise, render the query.
          this.processFragment(fragment as Fragment, { ...context, jsonPath: String(index) });
        }
      } catch (error) {
        if (typeof error === "string") {
          this.withError(String(index), "unknown", error, context);
          return;
        }
        if (typeof error === "object" && error && "path" in error) {
          const pathError = error as PathError;
          this.withError(pathError.path, "unknown", pathError.message, context);
          return;
        }
        this.withError(String(index), "unknown", (error as Error).message, context);
      }
    }
  }

  /**
   * Invokes the path processor for each $include directive value.
   *
   * @param query   The $include directive.
   * @param context The execution context.
   */
  private processInclude(query: IncludeDirective, context: FileProcessorContext<QueryProcessorContext>): void {
    const pathProcessor = new PathProcessor(path.dirname(context.path), this);
    for (const includePath of asArray(query.$include)) {
      const absolutePath = path.resolve(path.dirname(context.path), includePath);
      if (!existsSync(absolutePath)) {
        throw new PathError(`${absolutePath} does not exist`, context.jsonPath || "", "$include");
      }

      pathProcessor.processPath(includePath, context);
    }
  }

  /**
   * Invokes the path processor for each $include directive value.
   *
   * @param fragment   The $include directive.
   * @param context The execution context.
   */
  private processFragment(fragment: Fragment, context: QueryProcessorContext): void {
    const entityProjection = fragment.on;
    const entityName = Joins.viaFrom(entityProjection);

    const fragmentSchema: ObjectSchema = EntityProjections.projectionSchema(
      entityProjection,
      entityName,
      context.jsonPath || "",
      context,
    ) as ObjectSchema;

    context.schemaRegistry.set(fragment.name, fragmentSchema);
    context.schemaRegistry.registerFragment(fragment);
  }
}
