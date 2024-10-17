import { OpenAPIV3 } from "openapi-types";

import { asArray, toSummaryCase } from "../util";

import { FindQueryGenerator, FindQueryProcessorContext } from "./find-query";
import { QueryProcessorContext } from "./query-generator";

import { JsonPath, aOrAn, toPascalCase } from "../../../common";
import { PathError } from "../../../common/io";
import { JoinDirective, RetrieveQuery } from "../../../specification";
import { Joins } from "../../../specification/joins";
import { Url, UrlBuilder } from "../builder";

export class FindOneQueryGenerator extends FindQueryGenerator<RetrieveQuery> {
  protected getFindKeyword(): keyof RetrieveQuery {
    return "findOne";
  }

  /**
   * Runs all pre-check validations on the query.
   *
   * @param query   The query to render.
   * @param context The execution context.
   */
  protected beforeRender(query: RetrieveQuery, context: FindQueryProcessorContext): void {
    super.beforeRender(query, context);

    const givenDirectives = context.givenDirectives;
    const findDirective = context.findDirective;
    if (!givenDirectives || !findDirective) {
      throw new Error("illegal state");
    }

    if (givenDirectives.length > 0) {
      const lastGiven = givenDirectives[givenDirectives.length - 1];
      if (lastGiven.entity() !== findDirective.entity()) {
        throw new PathError(
          `final given entity should match "findOne" entity, looking for [${lastGiven.entity()}] but found [${findDirective.entity()}]`,
          JsonPath.resolve(context.jsonPath || "", "findOne"),
          "findOne",
        );
      }
    }
  }

  protected buildOperationId(query: RetrieveQuery, context: FindQueryProcessorContext): string {
    if (query.name) {
      return query.name;
    }

    const givenDirectives = context.givenDirectives;
    const findDirective = context.findDirective;
    if (!givenDirectives || !findDirective) {
      throw new Error("illegal state");
    }

    if (query.filterableBy || query.sortableBy || givenDirectives.length == 0) {
      return "retrieve" + toPascalCase(findDirective.path());
    }

    return "retrieve" + givenDirectives.map((directive) => toPascalCase(directive.path())).join("");
  }

  protected buildUrl(query: RetrieveQuery, context: FindQueryProcessorContext): Url {
    const givenDirectives = context.givenDirectives;
    const findDirective = context.findDirective;
    if (!givenDirectives || !findDirective) {
      throw new Error("illegal state");
    }

    const urlBuilder = UrlBuilder.newBuilder();
    const pathBuilder = urlBuilder.path();

    if (query.filterableBy || query.sortableBy) {
      pathBuilder.withNoun("retrieve", false);
      pathBuilder.withNoun(findDirective.asIdentifier(context), false);
    } else {
      // Use either the given directives or the find directive to build the path.
      (givenDirectives.length > 0 ? givenDirectives : [findDirective]).forEach((directive) => {
        if (directive.isSingleton(context)) {
          pathBuilder.withNoun(directive.path(), false);
        } else {
          pathBuilder.withNoun(directive.path(), true);
          pathBuilder.withIdentifier(directive.path());
        }
      });
    }

    return urlBuilder.build();
  }

  protected buildSummary(query: RetrieveQuery): string {
    if (query.summary) {
      return query.summary;
    }

    const entities = asArray<JoinDirective>(query.findOne);
    const sourceDirective = entities.pop();

    if (!sourceDirective) {
      throw new Error("could not determine source entity.");
    }

    const sourceEntity = Joins.viaFrom(sourceDirective);

    return (
      "Find " +
      aOrAn(sourceEntity) +
      " " +
      toSummaryCase(sourceEntity) +
      (entities.length > 0
        ? entities.reduce((prev, current, index) => {
            return prev + (index > 0 ? " and " : "") + toSummaryCase(Joins.viaFrom(current));
          }, " for a given ")
        : "") +
      "."
    );
  }

  protected buildResponse(query: RetrieveQuery, context: QueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return this.getBaseSchemaObject(query, context);
  }
}
