import { OpenAPIV3 } from "openapi-types";
import _ = require("underscore");

import {
  getAggregationMetric,
  getBucketAlgorithmFieldName,
  getMetricAlgorithmFieldName,
  renderBucketAggregationSchema,
  renderMetricAggregationSchema,
} from "../aggregations";
import { Url, UrlBuilder } from "../builder";
import { arraySchema, asArray, toSummaryCase } from "../util";

import { UnknownEdgeError } from "./errors";
import { QueryProcessorContext } from "./query-generator";

import { JsonPath, oxfordJoin, pluralize, toKebabCase, toPascalCase, toTitleCase } from "../../../common";
import { PathError } from "../../../common/io";
import { asSchemaObject } from "../../../entities";
import {
  Aggregation,
  BucketAggregation,
  Cardinality,
  DependencyGraph,
  DistinctProjection,
  EntityProjection,
  EntitySchema,
  GroupBy,
  MetricAggregation,
  Node,
  Nodes,
  SelectQuery,
  ViaEntry,
  isBucketAggregation,
  isDistinctProjection,
  isEntityProjection,
  isGroupBy,
  isViaEntry,
} from "../../../specification";
import { EntityProjections, Joins } from "../../../specification/joins";
import { BaseQueryGenerator } from "./base-query-generator";

interface SelectQueryProcessorContext extends QueryProcessorContext {
  filterBy: Array<string>;
  groupBy: Array<GroupBy>;
  sourceEntity: string;
  aggregations: Array<Aggregation>;
  reportName: string;
}

export const UnknownEntity = "unknown";

/**
 * Used to render a select-style query.
 *
 * For example:
 *
 * ```yaml
 * select:
 *  - facility:
 *      - id
 *      - logo
 *      - name
 *  - sum:
 *      field: amount
 *      as: total
 *  - name: totalByYear
 *    date_histogram:
 *      interval: year
 *      calculate:
 *        sum:
 *          field: amount
 *  - name: totalByNature
 *    terms:
 *      field: nature
 *      calculate:
 *        sum:
 *          field: amount
 * ```
 */
export class SelectQueryGenerator extends BaseQueryGenerator<SelectQuery> {
  /**
   * Renders a SelectQuery as an OpenAPI operation.
   *
   * @param query          The user supplied query to be rendered as an OpenAPI operation.
   * @param schemaRegistry The registry of known schemas, used to generate the response schema.
   * @param openAPI        The OpenAPI Specification, where the rendered operation should be placed.
   * @param graph          The dependency graph, used to walk the query joins.
   */
  public render(query: SelectQuery, context: QueryProcessorContext): void {
    const filterBy = asArray(query.given);
    const groupBy = this.getGroupBy(query);
    const sourceEntity = this.determineSourceEntity(query, groupBy, context.graph);
    const aggregations = this.getAggregations(query);
    const reportName = this.renderOperationId(sourceEntity, aggregations, query.name, groupBy);

    const selectContext: SelectQueryProcessorContext = {
      filterBy,
      groupBy,
      sourceEntity,
      aggregations,
      reportName,
      ...context,
    };

    return super.render(query, selectContext);

    // const from = asArray(query.from);
    // const filterBy = asArray(query.filterBy);

    // checkNotNull(query, "query must be specified.");
    // checkNotNull(context, "context must be specified.");

    // checkNotEmpty(from, "query must have at least one from field defined.");

    // const aggregations = this.getAggregations(query);
    // const groupBy = this.getGroupBy(query);
    // const sourceEntity = this.determineSourceEntity(query, groupBy, context.graph);
    // const operationId = this.renderOperationId(sourceEntity, aggregations, groupBy);
    // const summary = this.renderSummary(sourceEntity, aggregations, asArray(query.filterBy), groupBy);
    // const url = this.renderUrl(query, operationId);
    // const tag = this.renderTag(query, sourceEntity);
    // const responseSchema = this.renderResponseSchema(query, groupBy, aggregations, sourceEntity, context);

    // OpenAPIBuilder.newBuilder(context.openAPI, context.schemaRegistry)
    //   .path(url.path)
    //   .get()
    //   .withOperationId("list" + filterBy.map(toPascalCase) + "Report" + toPascalCase(operationId))
    //   .withSummary(summary)
    //   .withParameters([...url.parameters, ...PaginationParameters])
    //   .withTag(tag)
    //   .withSuccessResponse(200, summary, arraySchema(responseSchema), Metadata)
    //   .build();
  }

  protected buildUrl(query: SelectQuery, context: QueryProcessorContext): Url {
    const selectContext: SelectQueryProcessorContext = context as SelectQueryProcessorContext;
    return this.renderUrl(query, selectContext.reportName);
  }

  protected buildOperationId(query: SelectQuery, context: QueryProcessorContext): string {
    const selectContext: SelectQueryProcessorContext = context as SelectQueryProcessorContext;

    return "list" + selectContext.filterBy.map(toPascalCase).join("") + "Report" + toPascalCase(selectContext.reportName);
  }
  protected buildSummary(query: SelectQuery, context: QueryProcessorContext): string {
    const selectContext: SelectQueryProcessorContext = context as SelectQueryProcessorContext;
    return this.renderSummary(selectContext.sourceEntity, selectContext.aggregations, asArray(query.given), selectContext.groupBy);
  }
  protected buildTag(query: SelectQuery, context: QueryProcessorContext): string {
    const selectContext: SelectQueryProcessorContext = context as SelectQueryProcessorContext;
    return this.renderTag(query, selectContext.sourceEntity);
  }
  protected buildResponse(query: SelectQuery, context: QueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    const selectContext: SelectQueryProcessorContext = context as SelectQueryProcessorContext;
    return this.renderResponseSchema(query, selectContext.groupBy, selectContext.aggregations, selectContext.sourceEntity, context);
  }
  protected getSourceEntity(query: SelectQuery, context: QueryProcessorContext): string {
    const selectContext: SelectQueryProcessorContext = context as SelectQueryProcessorContext;
    return this.determineSourceEntity(query, selectContext.groupBy, context.graph);
  }

  /**
   * Renders the URL portion of the SelectQuery.
   *
   * Each "filterBy" should be included as a path collection noun and a path Identifier.
   *
   * @param query       The user supplied query to be rendered as an OpenAPI operation.
   * @param operationId The operation identifier, used as the report name in the URL.
   *
   * @returns   The rendered URL.
   */
  private renderUrl(query: SelectQuery, operationId: string): Url {
    const urlBuilder = UrlBuilder.newBuilder();

    asArray(query.given).forEach((filteredEntity) => {
      urlBuilder.path().withNoun(filteredEntity, true).withIdentifier(filteredEntity);
    });

    urlBuilder.path().withNoun("reports", false).withNoun(toKebabCase(operationId), false);

    return urlBuilder.build();
  }

  private renderOperationId(
    sourceEntity: string,
    aggregations: Array<Aggregation>,
    name: string | undefined,
    groupBy: Array<GroupBy>,
  ): string {
    if (name) {
      return toPascalCase(name);
    }

    const aggregationNames = _.chain(aggregations).map(getAggregationMetric).uniq().value();
    let result: string = "";

    if (aggregationNames.length === 1) {
      result += toPascalCase(aggregationNames[0]);
    } else {
      result += "Aggregated";
    }

    result += toPascalCase(pluralize(sourceEntity));

    if (groupBy.length > 0) {
      result += "By" + this.getGroupByEntities(groupBy).map(toPascalCase).join("And");
    }

    return result;
  }

  private renderSummary(sourceEntity: string, aggregations: Array<Aggregation>, filterBy: Array<string>, groupBy: Array<GroupBy>): string {
    const aggregationNames = _.chain(aggregations).map(getAggregationMetric).uniq().value();
    let result: string;
    if (aggregationNames.length === 1) {
      result = toTitleCase(pluralize(aggregationNames[0]));
    } else {
      result = "Aggregates";
    }

    result += " all " + toSummaryCase(pluralize(sourceEntity));

    // Add the " for a given A and B", where A and B are filters.
    if (filterBy.length > 0) {
      result += " for a given " + _.chain(filterBy).map(toSummaryCase).join(" and ").value();
    }

    // Add the " grouped by X and Y and Z", where X and Y and Z are group by entities
    if (groupBy.length > 0) {
      result +=
        " grouped by " +
        oxfordJoin(
          this.getGroupByEntities(groupBy).map((name) => toSummaryCase(pluralize(name))),
          "and",
        );
    }

    return result;
  }

  /**
   * Determines the name of the entity that best describes the source entity for the query.
   *
   * @param query          The user supplied query to be rendered as an OpenAPI operation.
   * @param graph          The dependency graph, used to walk the query joins.
   *
   * @returns   The name of the root entity that is being queried.
   */
  private determineSourceEntity(query: SelectQuery, groupBys: Array<GroupBy>, graph: DependencyGraph): string {
    // Determine all of the entities that were included in the FROM clause.
    const entities = this.getJoinedEntities(query, graph);

    // Remove all entities that are in the filterBy or groupBy.
    const filterBy = asArray(query.given).map((entity) => entity.toLowerCase());
    const groupBy = this.getGroupByEntities(groupBys).map((entity) => entity.toLowerCase());

    const candidates = entities.filter((entity: string): boolean => {
      if (filterBy.includes(entity.toLowerCase())) {
        return false;
      }
      if (groupBy.includes(entity.toLowerCase())) {
        return false;
      }
      return true;
    });

    if (candidates.length > 0) {
      return candidates[candidates.length - 1];
    }

    return UnknownEntity;
  }

  private getJoinedEntities(query: SelectQuery, graph: DependencyGraph): Array<string> {
    const joinedEntities: Array<string> = [];

    let node: Node;
    asArray(query.from).forEach((entityOrRelationshp, index) => {
      if (index === 0) {
        node = graph.get(entityOrRelationshp) as Node;
      } else {
        const edge = Nodes.findEdge(node, entityOrRelationshp);
        if (!edge) {
          throw new UnknownEdgeError(entityOrRelationshp, `from.${index}`, "select-from");
        }
        node = edge.node;
      }

      joinedEntities.push(node.name);
    });

    return joinedEntities;
  }

  /**
   * Extracts all group by entities from the SELECT clause.
   *
   *
   * @param query   The user supplied query to be rendered as an OpenAPI operation.
   * @returns   The collection of group by entities from the SELECT clause.
   */
  private getGroupBy(query: SelectQuery): Array<GroupBy> {
    return _.chain(query.select)
      .filter((term: GroupBy | Aggregation) => {
        return isGroupBy(term);
      })
      .map((term: GroupBy | Aggregation): GroupBy => term as GroupBy)
      .value();
  }

  private getGroupByEntities(groupBy: Array<GroupBy>): Array<string> {
    return _.chain(groupBy)
      .map((projection: GroupBy): Array<string> => {
        return this.groupByEntity(projection);
      })
      .flatten()
      .value();
  }

  private groupByEntity(groupBy: GroupBy): Array<string> {
    if (isDistinctProjection(groupBy)) {
      return this.groupByEntity((groupBy as DistinctProjection).distinct);
    }
    if (isEntityProjection(groupBy)) {
      return Object.keys(groupBy);
    }

    if (isViaEntry(groupBy)) {
      return [groupBy as ViaEntry];
    }

    throw new Error("unsupported group by " + String(groupBy));
  }

  /**
   * Extracts all aggregations from the SELECT clause.
   *
   * @param query   The user supplied query to be rendered as an OpenAPI operation.
   * @returns   The collection of aggregations from the SELECT clause.
   */
  private getAggregations(query: SelectQuery): Array<Aggregation> {
    return _.chain(query.select)
      .filter((term: GroupBy | Aggregation) => {
        return !isGroupBy(term);
      })
      .map((term) => term as Aggregation)
      .value();
  }

  /**
   * Determines which tag the Open API operation should use.
   *
   * Default to the user supplied tag, if one is given.  If a filterBy clause is given then use the first filterBy entry. Otherwise,
   * default to the expected source entry.
   *
   * @param query           The user supplied query to be rendered as an OpenAPI operation.
   * @param sourceEntity    The user supplied query to be rendered as an OpenAPI operation.
   *
   * @returns The Open API tag for the query.
   */
  private renderTag(query: SelectQuery, sourceEntity: string): string {
    const filterBy = asArray(query.given);

    if (query.tag) {
      return query.tag;
    }

    if (filterBy.length > 0) {
      return toPascalCase(pluralize(filterBy[0]));
    }

    return toPascalCase(pluralize(sourceEntity));
  }

  private renderResponseSchema(
    query: SelectQuery,
    groupBy: Array<GroupBy>,
    aggregateBy: Array<Aggregation>,
    sourceEntity: string,
    context: QueryProcessorContext,
  ): OpenAPIV3.SchemaObject {
    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Initialize the resulting schema
    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const aggregations: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {},
    };

    const result: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        aggregations,
      },
    };

    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Include the groupBy fields
    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    groupBy.forEach((projection: GroupBy): void => {
      const index = query.select.indexOf(projection);
      this.projectGroupBy(projection, context, sourceEntity, index, result);
    });

    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Include the calculated fields
    // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    aggregateBy.forEach((aggregation: Aggregation) => {
      let name: string;
      let schema: OpenAPIV3.SchemaObject;
      const index = query.select.indexOf(aggregation);
      const jsonPath = JsonPath.resolve(context.jsonPath || "", "select", String(index));

      if (isBucketAggregation(aggregation)) {
        name = getBucketAlgorithmFieldName(aggregation as BucketAggregation);
        schema = renderBucketAggregationSchema(aggregation as BucketAggregation, sourceEntity, { ...context, jsonPath });
      } else {
        name = getMetricAlgorithmFieldName(aggregation as MetricAggregation);
        schema = renderMetricAggregationSchema(aggregation as MetricAggregation, sourceEntity, { ...context, jsonPath });
      }

      aggregations.properties = aggregations.properties || {};
      aggregations.properties[name] = schema;
    });

    if (groupBy.length > 0) {
      return arraySchema(result);
    } else {
      return result;
    }
  }

  private projectGroupBy(
    projection: GroupBy,
    context: QueryProcessorContext,
    sourceEntity: string,
    index: number,
    result: OpenAPIV3.NonArraySchemaObject,
    distinct: boolean = false,
  ) {
    if (isDistinctProjection(projection)) {
      const distinctProjection = projection as DistinctProjection;
      this.projectGroupBy(distinctProjection.distinct, context, sourceEntity, index, result, true);
    }

    if (isEntityProjection(projection)) {
      const entity = Joins.viaFrom(projection as EntityProjection);
      if (UnknownEntity === sourceEntity) {
        const projectedSchema = EntityProjections.projectionSchema(
          projection as EntityProjection,
          entity,
          JsonPath.resolve(context.jsonPath || "", "select", String(index), entity),
          context,
        );

        const schemaObj = asSchemaObject(projectedSchema);

        result.properties = result.properties || {};
        result.properties[entity] = schemaObj;
      } else {
        const node = context.graph.get(sourceEntity);
        if (!node) {
          throw new PathError(
            `detected unresolvable edge ${entity}`,
            JsonPath.resolve(context.jsonPath || "", "select", String(index)),
            "select",
          );
        }
        const edge = Nodes.findEdge(node, entity);
        if (!edge) {
          throw new PathError(
            `detected unresolvable edge ${entity}`,
            JsonPath.resolve(context.jsonPath || "", "select", String(index)),
            "select",
          );
        }
        // const entitySchema: EntitySchema = context.schemaRegistry.get(edge?.node.name);

        // const entitySchema: EntitySchema = context.schemaRegistry.get(entity);
        const projectedSchema = EntityProjections.projectionSchema(
          projection as EntityProjection,
          edge?.node.name,
          JsonPath.resolve(context.jsonPath || "", "select", String(index), entity),
          context,
        );

        const schemaObj = asSchemaObject(projectedSchema);

        result.properties = result.properties || {};
        result.properties[entity] = !distinct && Cardinality.isToMany(edge.cardinality) ? arraySchema(schemaObj) : schemaObj;
      }
    } else if (isViaEntry(projection)) {
      const viaEntry = projection as ViaEntry;
      const node = context.graph.get(sourceEntity);
      if (!node) {
        throw new PathError(
          `detected unresolvable edge ${viaEntry}`,
          JsonPath.resolve(context.jsonPath || "", "select", String(index)),
          "select",
        );
      }
      const edge = Nodes.findEdge(node, viaEntry);
      if (!edge) {
        throw new PathError(
          `detected unresolvable edge ${viaEntry}`,
          JsonPath.resolve(context.jsonPath || "", "select", String(index)),
          "select",
        );
      }
      const entitySchema: EntitySchema = context.schemaRegistry.get(edge?.node.name);
      const schemaObj = asSchemaObject(entitySchema);

      result.properties = result.properties || {};
      result.properties[viaEntry] = !distinct && Cardinality.isToMany(edge.cardinality) ? arraySchema(schemaObj) : schemaObj;
    }
  }
}
