import { OpenAPIV3 } from "openapi-types";

import { asArray, toSummaryCase } from "../util";

import { FindQueryGenerator } from "./find-query";
import { QueryProcessorContext } from "./query-generator";

import { aOrAn, toPascalCase } from "../../../common";
import { RetrieveQuery } from "../../../specification";
import { Joins } from "../../../specification/joins";

export class FindOneQueryGenerator extends FindQueryGenerator<RetrieveQuery> {
  protected getFindKeyword(): keyof RetrieveQuery {
    return "findOne";
  }

  protected buildOperationId(query: RetrieveQuery): string {
    if (query.name) {
      return query.name;
    }

    const entities = asArray(query.findOne);
    return "retrieve" + entities.map((entity) => toPascalCase(Joins.viaFrom(entity))).join("");
  }

  protected buildSummary(query: RetrieveQuery): string {
    if (query.summary) {
      return query.summary;
    }

    const entities = asArray(query.findOne);
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
