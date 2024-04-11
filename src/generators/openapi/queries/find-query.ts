import { OpenAPIV3 } from "openapi-types";

import { Url, UrlBuilder } from "../builder";
import { asArray, entitySchemaRef } from "../util";

import { BaseQueryGenerator } from "./base-query-generator";
import { QueryProcessorContext } from "./query-generator";
import { forEachItem } from "./util";

import { JsonPath, pluralize, toPascalCase } from "../../../common";
import { PathError } from "../../../common/io";
import { asSchemaObject, isSingleton } from "../../../entities";
import { jsonPropertyCase } from "../../../models";
import {
  ArraySchema,
  Cardinality,
  EntitySchema,
  FindType,
  JoinDirective,
  ListQuery,
  Node,
  Nodes,
  ObjectSchema,
  RetrieveQuery,
} from "../../../specification";
import { Joins } from "../../../specification/joins";

/**
 * The FindQueryGenerator is the base class for the `findOne` and `findAll` query renderers.
 */
export abstract class FindQueryGenerator<T extends ListQuery | RetrieveQuery> extends BaseQueryGenerator<T> {
  /**
   * Runs all pre-check validations on the query.
   *
   * @param query   The query to render.
   * @param context The execution context.
   */
  protected beforeRender(query: T, context: QueryProcessorContext): void {
    this.validateFilterBy(query, context);
  }

  /**
   * Validates that all filterBy entities exist in the service specification.
   *
   * @param query   The query to render.
   * @param context The execution context.
   */
  private validateFilterBy(query: T, context: QueryProcessorContext) {
    forEachItem(query, "filterBy", context.jsonPath || "", (filter: string, path) => {
      this.entityInSpecificationEntities(filter, path, context);
      this.filterByInFindBy(query, filter, path);
    });
  }

  /**
   * Ensures that the given entity exists.
   *
   * @param entity    The entity to validate.
   * @param jsonPath  The JSON path pointing to where the entity was detected.
   * @param context   The execution context.
   */
  private entityInSpecificationEntities(entity: string, jsonPath: string, context: QueryProcessorContext) {
    if (!context.specification.entities.includes(entity)) {
      throw new PathError(`unknown filterBy entity [${entity}]`, jsonPath, "filterBy");
    }
  }

  /**
   * Ensures that the given entity exists.
   *
   * @param entity    The entity to validate.
   * @param jsonPath  The JSON path pointing to where the entity was detected.
   * @param context   The execution context.
   */
  private filterByInFindBy(query: T, entity: string, jsonPath: string) {
    if (!asArray(this.getFindType(query)).includes(entity)) {
      throw new PathError(`filterBy entity [${entity}] must be in [${String(this.getFindKeyword())}]`, jsonPath, "filterBy");
    }
  }

  /**
   * Builds the query's URL.
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the query's URL.
   */
  protected buildUrl(query: T, context: QueryProcessorContext): Url {
    const urlBuilder = UrlBuilder.newBuilder();
    const pathBuilder = urlBuilder.path();

    const find = asArray(this.getFindType(query));
    const filters = asArray(query.filterBy);

    if (find.length === 0) {
      throw new Error("nothing to find");
    }

    // Not all entities have edges, if we are only finding a root entity, then we don't need to check the dependency graph.
    if (find.length === 1) {
      const entity = Joins.viaFrom(find[0]);

      pathBuilder.withNoun(entity, !isSingleton(context.schemaRegistry.get(entity)));
      if (filters.includes(entity)) {
        pathBuilder.withIdentifier(entity);
      }
      return urlBuilder.build();
    }

    // At this point, we are following one or more edges, we must use the dependency graph to walk the route.
    let node: Node | undefined;
    for (let index = 0; index < find.length; index++) {
      const entity = Joins.viaFrom(find[index]);
      const alias = context.schemaRegistry.getAlias(entity);
      const isNotAliased = context.schemaRegistry.has(alias);

      pathBuilder.withNoun(alias, index === 0 ? !isSingleton(context.schemaRegistry.get(entity)) : isNotAliased);
      if (filters.includes(entity)) {
        pathBuilder.withIdentifier(alias);
      }

      if (context.graph.has(entity)) {
        node = context.graph.get(entity) as Node;
      } else {
        if (!node) {
          throw new Error(`could not determine query join for [${entity}]`);
        }

        const edge = Nodes.findEdge(node, entity);

        if (!edge) {
          throw new Error("could not determine query join for " + entity);
        }

        node = edge.node;
      }
    }

    return urlBuilder.build();
  }

  /**
   * Determines the base entity type that the query is returning.
   *
   * @param query   The query to be rendered.
   * @param context The execution context.
   *
   * @returns the base entity type that the query is returning.
   */
  protected getSourceEntity(query: T, context: QueryProcessorContext): string {
    const find = asArray(this.getFindType(query));
    const keyword = this.getFindKeyword() as string;

    if (find.length === 0) {
      throw new PathError("nothing to find", context.jsonPath || "", "find");
    }

    // Not all entities have edges, if we are only finding a root entity, then we don't need to check the dependency graph.
    if (find.length === 1) {
      return Joins.viaFrom(find[0]);
    }

    const findJsonPath = JsonPath.resolve(context.jsonPath || "", keyword);

    // At this point, we are following one or more edges, we must use the dependency graph to walk the route.
    let node: Node | undefined;
    for (let index = 0; index < find.length; index++) {
      const entity = Joins.viaFrom(find[index]);
      const jsonPath = JsonPath.resolve(findJsonPath, String(index));

      if (context.graph.has(entity)) {
        node = context.graph.get(entity) as Node;
      } else {
        if (!node) {
          throw new PathError(`could not determine query join for [${entity}]`, jsonPath, keyword);
        }

        const edge = Nodes.findEdge(node, entity);
        if (!edge) {
          throw new PathError("could not determine query join for " + entity, jsonPath, keyword);
        }

        node = edge.node;
      }
    }

    if (!node) {
      throw new PathError("could not determine path node.", findJsonPath, keyword);
    }
    return node.name;
  }

  protected buildTag(query: T, context: QueryProcessorContext): string {
    if (query.tag) {
      return query.tag;
    }

    const sourceEntity = toPascalCase(this.getSourceEntity(query, context));
    return toPascalCase(pluralize(sourceEntity));
  }

  protected getFindType(query: T): FindType {
    return query[this.getFindKeyword()] as FindType;
  }
  protected abstract getFindKeyword(): keyof T;

  protected getBaseSchemaObject(query: T, context: QueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    const sourceEntity = this.getSourceEntity(query, context);
    const find = asArray(this.getFindType(query));
    const source = find.pop();
    if (!source) {
      throw new PathError("could not determine source entity", context.jsonPath || "", String(this.getFindKeyword()));
    }

    const schema: EntitySchema = Joins.joinSchema(
      source,
      context.schemaRegistry.get(sourceEntity) as EntitySchema,
      context.jsonPath || "",
    ) as EntitySchema;

    if (!query.join) {
      if (Joins.isViaEntry(source)) {
        return entitySchemaRef(sourceEntity);
      }

      return asSchemaObject(schema);
    }

    const map = new Map<string, ObjectSchema>();
    // const schema: EntitySchema = context.schemaRegistry.get(sourceEntity);

    const sourceNode = context.graph.has(sourceEntity) ? context.graph.get(sourceEntity) : undefined;

    map.set(sourceEntity.toLowerCase(), schema);

    forEachItem(query, "join", context.jsonPath || "", (join: JoinDirective, path: string) => {
      const entity = Joins.viaFrom(join);
      if (!sourceNode) {
        throw new PathError(`cannot join on [${sourceEntity}] as it has zero relationships`, path, "join");
      }

      const edge = Nodes.findEdge(sourceNode, entity);
      if (!edge) {
        throw new PathError("could not determine join edge from join name " + entity, path, "join");
      }

      const edgeSchema = context.schemaRegistry.get(edge.node.name);
      if (!edgeSchema) {
        throw new PathError("could not find schema for join entity " + edge.name, path, "join");
      }

      map.set(entity.toLowerCase(), edgeSchema as ObjectSchema);
    });

    forEachItem(query, "join", context.jsonPath || "", (join: JoinDirective, path: string) => {
      const entity = Joins.viaFrom(join);

      if (!sourceNode) {
        throw new PathError("attempted to join on node with zero relationships", path, "join");
      }

      const edge = Nodes.findEdge(sourceNode, entity);
      if (!edge) {
        throw new PathError(`could not determine join edge from join name [${entity}]`, path, "join");
      }

      // Figure out which relationship this join is using.
      const container = map.get(sourceEntity);
      if (!container) {
        throw new PathError("could not find container", path, "join");
      }
      // const item = edge.node.name;

      // Figure out if the property is a collection;
      const isCollection = Cardinality.isToMany(edge.cardinality);
      // const alias = schemaRegistry.getAlias(item);

      const itemSchema = map.get(entity);
      if (!itemSchema) {
        throw new PathError("could not determine item schema", path, "join");
      }

      container.properties = container.properties || {};
      if (isCollection) {
        container.properties[jsonPropertyCase(edge.name)] = {
          type: "array",
          items: Joins.joinSchema(join, itemSchema, path),
        } as ArraySchema;
      } else {
        container.properties[jsonPropertyCase(edge.name)] = Joins.joinSchema(join, itemSchema, JsonPath.resolve(path, entity));
      }
    });

    return asSchemaObject(schema);
  }
}
