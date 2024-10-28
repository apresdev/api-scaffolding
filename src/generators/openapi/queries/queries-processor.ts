import { existsSync } from "node:fs";
import path from "node:path";

import { asArray } from "../util";

import { FindAllQueryGenerator } from "./find-all-query";
import { FindOneQueryGenerator } from "./find-one-query";
import { QueryGenerator, QueryProcessorContext } from "./query-generator";
import { SearchQueryGenerator } from "./search-query";
import { isListQuery, isNamedQuery, isRetrieveQuery, isSearchQuery } from "./util";

import { FileErrors, JsonPath, SchemaValidator, SourceMaps } from "../../../common";
import { FileProcessor, FileProcessorContext, PathError } from "../../../common/io";
import { PathProcessor } from "../../../common/io/path-processor";
import { BaseQuery, IncludeDirective, Queries, isIncludeDirective } from "../../../specification";
import { NamedQueryGenerator } from "./named-query";

/* eslint-disable import/no-namespace */
import * as queriesSchema from "../../../schemas/queries.json";
/* eslint-enable import/no-namespace */

const queriesValidator = new SchemaValidator<Queries>(queriesSchema, new SourceMaps());

interface QueryGeneratorEntry<T extends BaseQuery> {
  predicate: (query: BaseQuery) => boolean;
  generator: QueryGenerator<T>;
}

const queryGenerators: Array<QueryGeneratorEntry<BaseQuery>> = [
  { predicate: isSearchQuery, generator: new SearchQueryGenerator() },
  { predicate: isListQuery, generator: new FindAllQueryGenerator() },
  { predicate: isRetrieveQuery, generator: new FindOneQueryGenerator() },
  { predicate: isNamedQuery, generator: new NamedQueryGenerator() },
];

/**
 * Processes a collection of Query definitions.
 */
export class QueriesProcessor extends FileProcessor<Queries, QueryProcessorContext> {
  /**
   * Creates an instance of a QueriesProcessor.
   *
   * @param fileErrors  The collector of file processing errors.
   */
  public constructor(fileErrors: FileErrors) {
    super(queriesValidator, fileErrors);
  }

  /**
   * Processes a collection of Query nodes.
   *
   * @param queries The collection of Query's to process.
   * @param context The execution context.
   */
  public processModel(queries: Queries, context: FileProcessorContext<QueryProcessorContext>): void {
    // Iterate through each query in the collection.
    for (const [index, query] of queries.entries()) {
      try {
        // Check to see if the query is actually a $include directive...
        if (isIncludeDirective(query)) {
          // ... if it is, then process the include directive.
          this.processInclude(query as IncludeDirective, {
            ...context,
            jsonPath: String(index),
          });
        } else {
          // ... otherwise, render the query.
          this.processQuery(query as BaseQuery, { ...context, jsonPath: JsonPath.resolve(context.jsonPath || "", String(index)) });
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
   * @param query   The $include directive.
   * @param context The execution context.
   */
  private processQuery<T extends BaseQuery>(query: T, context: QueryProcessorContext): void {
    const entry: QueryGeneratorEntry<T> | undefined = queryGenerators.find((item) => item.predicate(query));

    if (!entry) {
      throw new PathError("encountered unexpected query type", context.jsonPath || "", "unsupported-query");
    }

    entry.generator.render(query, context);
  }
}
