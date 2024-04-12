import * as fs from "fs";
import * as path from "path";

import { asArray } from "../util";

import { FindAllQueryGenerator } from "./find-all-query";
import { FindOneQueryGenerator } from "./find-one-query";
import { QueryGenerator, QueryProcessorContext } from "./query-generator";
import { SearchQueryGenerator } from "./search-query";
import { SelectQueryGenerator } from "./select-query";
import { isListQuery, isRetrieveQuery, isSearchQuery, isSelectQuery } from "./util";

import { FileErrors, SchemaValidator, SourceMaps } from "../../../common";
import { FileProcessor, FileProcessorContext, PathError } from "../../../common/io";
import { PathProcessor } from "../../../common/io/path-processor";
import * as queriesSchema from "../../../schemas/queries.json";
import { IncludeDirective, Queries, Query, isIncludeDirective } from "../../../specification";

const queriesValidator = new SchemaValidator<Queries>(queriesSchema, new SourceMaps());

interface QueryGeneratorEntry<T extends Query> {
  predicate: (query: Query) => boolean;
  generator: QueryGenerator<T>;
}

const queryGenerators: Array<QueryGeneratorEntry<Query>> = [
  { predicate: isSelectQuery, generator: new SelectQueryGenerator() },
  { predicate: isSearchQuery, generator: new SearchQueryGenerator() },
  { predicate: isListQuery, generator: new FindAllQueryGenerator() },
  { predicate: isRetrieveQuery, generator: new FindOneQueryGenerator() },
];

/**
 * Processes a collection of Query definitions.
 */
export class QueriesProcessor extends FileProcessor<Queries, QueryProcessorContext> {
  /**
   * Creates an instance of a QueriesProcessor.
   *
   * @param basePath    The base path when resolving relative path references.
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
    queries.forEach((query: Query, index: number): void => {
      try {
        // Check to see if the query is actually a $include directive...
        if (isIncludeDirective(query)) {
          // ... if it is, then process the include directive.
          this.processInclude(query as IncludeDirective, {
            ...context,
            jsonPath: String(index),
          });
        } else {
          // ... otherise, render the query.
          this.processQuery(query, { ...context, jsonPath: String(index) });
        }
      } catch (err) {
        if (typeof err === "string") {
          this.withError(String(index), "unknown", err, context);
          return;
        }
        if (typeof err === "object" && err && "path" in err) {
          const pathError = err as PathError;
          this.withError(pathError.path, "unknown", pathError.message, context);
          return;
        }
        this.withError(String(index), "unknown", (err as Error).message, context);
      }
    });
  }

  /**
   * Invokes the path processor for each $include directive value.
   *
   * @param query   The $include directive.
   * @param context The execution context.
   */
  private processInclude(query: IncludeDirective, context: FileProcessorContext<QueryProcessorContext>): void {
    const pathProcessor = new PathProcessor(path.dirname(context.path), this);
    asArray(query.$include).forEach((includePath) => {
      const absolutePath = path.resolve(path.dirname(context.path), includePath);
      if (!fs.existsSync(absolutePath)) {
        throw new PathError(`${absolutePath} does not exist`, context.jsonPath || "", "$include");
      }

      pathProcessor.processPath(includePath, context);
    });
  }

  /**
   * Invokes the path processor for each $include directive value.
   *
   * @param query   The $include directive.
   * @param context The execution context.
   */
  private processQuery<T extends Query>(query: T, context: QueryProcessorContext): void {
    const entry: QueryGeneratorEntry<T> | undefined = queryGenerators.find((entry) => entry.predicate(query));

    if (!entry) {
      throw new PathError("encountered unexpected query type", context.jsonPath || "", "unsupported-query");
    }

    entry.generator.render(query, context);
  }
}
