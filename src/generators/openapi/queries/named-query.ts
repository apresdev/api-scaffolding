import { OpenAPIV3 } from "openapi-types";
import { JsonPath, ajv, toCamelCase, toKebabCase } from "../../../common";
import { PathError } from "../../../common/io";
import { resolveFully } from "../../../models/util";
import { AnySchema, ObjectSchema, Cardinality, EntityName, EntityProjection, Nodes, isEntityProjection } from "../../../specification";
import { SchemaRegistry } from "../../../models/schema_registry";
import { Joins } from "../../../specification/joins";
import { ColumnDescriptor, Dimension, Measure, NamedQuery } from "../../../specification/named-query";
import { CONTENT_TYPE_JSON } from "../util";
import { QueryGenerator, QueryProcessorContext } from "./query-generator";

const NamedQueryResponseName = "ExecuteQueryResponse";

export class NamedQueryGenerator implements QueryGenerator<NamedQuery> {
  render(query: NamedQuery, context: QueryProcessorContext): void {
    this.generateExample(query, context);
  }

  private getResponse(context: QueryProcessorContext): OpenAPIV3.ResponseObject {
    context.openAPI.components = context.openAPI.components || {};
    context.openAPI.components.responses = context.openAPI.components.responses || {};

    if (!(NamedQueryResponseName in context.openAPI.components.responses)) {
      throw new PathError("template missing named query response", context.jsonPath || "", "unkown");
    }

    return context.openAPI.components.responses[NamedQueryResponseName] as OpenAPIV3.ResponseObject;
  }

  private getExamples(response: OpenAPIV3.ResponseObject): {
    [media: string]: OpenAPIV3.ReferenceObject | OpenAPIV3.ExampleObject;
  } {
    response.content = response.content || {};
    response.content[CONTENT_TYPE_JSON] = response.content[CONTENT_TYPE_JSON] || {};
    response.content[CONTENT_TYPE_JSON].examples = response.content[CONTENT_TYPE_JSON].examples || {};
    return response.content[CONTENT_TYPE_JSON].examples;
  }

  private generateExample(query: NamedQuery, context: QueryProcessorContext): void {
    const response = this.getResponse(context);
    const examples = this.getExamples(response);
    const columns = this.generateColumns(query, context);

    this.validateExample(columns, query, context);

    examples[toKebabCase(query.name)] = {
      value: {
        status: "success",
        metadata: {
          total: query.example?.length,
          offset: 0,
          columns,
        },
        data: query.example,
      },
    };
  }

  private validateExample(columns: Array<QueryResponseColumn>, query: NamedQuery, contex: QueryProcessorContext) {
    if (!query.example) {
      return;
    }

    // Compile the schema validator for each column.
    const validators = columns.map((responseColumn) => {
      return ajv.compile(responseColumn.dataType);
    });

    query.example.forEach((row, rowNum) => {
      // Check the column count.
      if (row.length !== columns.length) {
        throw new PathError(
          `column count mismatch, expected ${columns.length}, found ${row.length}`,
          JsonPath.resolve(contex.jsonPath || "", "example", String(rowNum)),
          "example",
        );
      }

      row.forEach((cell, colNum) => {
        // For now, we will assume that all cells are optional.
        if (null === cell) {
          return;
        }

        // Check the cell value.
        const validatorFn = validators[colNum];
        const results = validatorFn(cell);

        if (!results) {
          for (const error of validatorFn.errors || []) {
            throw new PathError(
              "invalid example: " + error.message,
              JsonPath.resolve(contex.jsonPath || "", "example", String(rowNum), String(colNum)),
              "example",
            );
          }
        }
      });
    });
  }

  private generateColumns(query: NamedQuery, context: QueryProcessorContext): Array<QueryResponseColumn> {
    const dimensions = query.query.dimensions || [];
    const measures = query.query.measures || [];

    return [
      ...dimensions.flatMap((dimension) => this.generateDimensionColumn(dimension, query, context)),
      ...measures.map((measure) => this.generateMeasureColumn(measure, query)),
    ];
  }

  private generateDimensionColumn(dimension: Dimension, query: NamedQuery, context: QueryProcessorContext) {
    if ("projection" in dimension) {
      const entity = Joins.viaFrom(dimension.projection) as EntityName;
      const schema = context.schemaRegistry.get(entity);
      return this.generateEntityPojectionColumns(dimension.projection, query, entity, schema, context);
    }

    return this.generateColumnDescriptorColumns(dimension as ColumnDescriptor, query);
  }

  private generateEntityPojectionColumns(
    projection: EntityProjection,
    query: NamedQuery,
    entity: EntityName,
    schema: AnySchema,
    context: QueryProcessorContext,
  ): Array<QueryResponseColumn> {
    const parentProjectedEntity = Joins.viaFrom(projection);
    return projection[parentProjectedEntity].flatMap((joinDirective) => {
      if (isEntityProjection(joinDirective)) {
        const subProjection = joinDirective as EntityProjection;
        const projectedEntity = Joins.viaFrom(subProjection);
        const node = context.graph.get(entity);
        const edge = Nodes.findEdge(node, projectedEntity);
        if (!edge) {
          throw new Error("could not resolve edge " + projectedEntity);
        }
        const subSchema = context.schemaRegistry.get(edge?.node.name);
        const columns = this.generateEntityPojectionColumns(subProjection, query, edge?.node.name, subSchema, context);
        columns.forEach((column) => {
          column.name = `${toCamelCase(parentProjectedEntity)}.${column.name}`;
          if (Cardinality.isToMany(edge.cardinality)) {
            column.dataType = {
              type: "array",
              items: column.dataType,
            };
          }
        });
        return columns;
      }

      // const alias = context.schemaRegistry.getAlias(entity);
      const column = Joins.viaFrom(joinDirective);
      return [
        {
          name: `${toCamelCase(parentProjectedEntity)}.${toCamelCase(String(column))}`,
          columnType: "dimension",
          dataType: this.getDataType(entity, column, schema, context),
          sortable: this.isEntityColumn(entity, column, query),
        },
      ];
    });
  }

  private getDataType(entity: string, column: string, schema: AnySchema, context: QueryProcessorContext): ValueType {
    if (!("properties" in schema)) {
      throw new Error("detected non-object projection");
    }

    if (!schema.properties) {
      throw new Error("detected undefined properties");
    }

    let propSchemaOrRef = schema.properties[column];
    if (!propSchemaOrRef) {
      throw new Error(`invalid property name "${column}" on entity "${entity}"`);
    }

    propSchemaOrRef = resolveSchema(propSchemaOrRef, context);

    const type = "type" in propSchemaOrRef ? propSchemaOrRef.type || "undefined" : "unknown";
    const format = "format" in propSchemaOrRef ? propSchemaOrRef.format : undefined;
    const items = "items" in propSchemaOrRef ? (resolveFully(propSchemaOrRef.items, context.schemaRegistry) as ValueType) : undefined;
    const properties = "properties" in propSchemaOrRef
      ? this.resolveProperties(propSchemaOrRef.properties as Record<string, AnySchema>, context.schemaRegistry)
      : undefined;

    return {
      type,
      format,
      items,
      properties
    };
  }

  private resolveProperties(properties: Record<string, AnySchema>, schemaRegistry: SchemaRegistry): Record<string, ValueType> {
    const resolved: Record<string, ValueType> = {};
    Object.keys(properties || {}).forEach((property) => {
      resolved[property] = (resolveFully(properties[property], schemaRegistry) as ValueType)
    });
    return resolved;
  }

  private generateColumnDescriptorColumns(descriptor: ColumnDescriptor, query: NamedQuery): Array<QueryResponseColumn> {
    return [
      {
        name: toCamelCase(descriptor.name),
        columnType: "dimension",
        dataType: this.toDataType(descriptor),
        sortable: this.isSortableColumn(descriptor.name, query),
      },
    ];
  }

  private toDataType(descriptor: ColumnDescriptor): ValueType {
    const copy = Object.assign({}, descriptor) as object;
    if ("name" in copy) {
      delete copy.name;
    }

    return copy as ValueType;
  }

  private generateMeasureColumn(measure: Measure, query: NamedQuery): QueryResponseColumn {
    return {
      name: measure.name,
      columnType: "measure",
      dataType: this.toDataType(measure),
      sortable: this.isSortableColumn(measure.name, query),
    };
  }

  private isSortableColumn(name: string, query: NamedQuery): boolean {
    if (!query.query.sortableBy) {
      return false;
    }

    return query.query.sortableBy.includes(name);
  }

  private isEntityColumn(entity: string, property: string, query: NamedQuery): boolean {
    if (!query.query.sortableBy) {
      return false;
    }

    return (
      query.query.sortableBy
        .filter(isEntityProjection)
        .map((projection) => projection as EntityProjection)
        .find((projection) => {
          if (Joins.viaFrom(projection) !== entity) {
            return false;
          }

          return projection[entity].includes(property);
        }) !== undefined
    );
  }
}

interface ValueType {
  type: string;
  format?: string;
  items?: ValueType;
  properties?: Record<string, ValueType>;
}

interface QueryResponseColumn {
  name: string;
  columnType: "dimension" | "measure";
  dataType: ValueType;
  sortable: boolean;
}

function resolveSchema(schema: AnySchema, context: QueryProcessorContext): AnySchema {
  if (!("$ref" in schema)) {
    return schema;
  }

  const refParts = schema.$ref.split("/");
  const referencedEntity = refParts[refParts.length - 1];
  const refSchema = context.schemaRegistry.get(referencedEntity);
  return resolveSchema(refSchema, context);
}
