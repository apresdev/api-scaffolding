import { OpenAPIV3 } from "openapi-types";

import { Url, UrlBuilder } from "../builder";
import { asArray } from "../util";

import { BaseQueryGenerator } from "./base-query-generator";
import { QueryProcessorContext } from "./query-generator";
import { forEachItem } from "./util";

import { JsonPath, pluralize, toPascalCase } from "../../../common";
import { PathError } from "../../../common/io";
import { isSingleton } from "../../../entities";
import { Fragments } from "../../../models";
import { FindType, JoinDirective, ListQuery, Node, Nodes, RetrieveQuery } from "../../../specification";
import { Joins } from "../../../specification/joins";
import { EntityDirective, compileDirectives } from "./directives";

export interface FindQueryProcessorContext extends QueryProcessorContext {
  givenDirectives?: Array<EntityDirective>;
  findDirective?: EntityDirective;
}

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
  protected beforeRender(query: T, context: FindQueryProcessorContext): void {
    // this.validateFilterBy(query, context);
    compileDirectives(query, this.getFindKeyword(), context);
  }

  protected getPathEntities(query: T, context: FindQueryProcessorContext): Array<string> {
    const filterBy = asArray(query.given);
    const result = [...filterBy];

    asArray<JoinDirective>(this.getFindType(query)).forEach((projection) => {
      let entity = Joins.viaFrom(projection);
      const fragment = context.schemaRegistry.getFragment(entity);
      if (fragment) {
        entity = Joins.viaFrom(fragment.on);
      }

      if (!filterBy.includes(entity)) {
        result.push(entity);
      }
    });

    return result;
  }

  /**
   * Validates that all filterBy entities exist in the service specification.
   *
   * @param query   The query to render.
   * @param context The execution context.
   */
  private validateFilterBy(query: T, context: FindQueryProcessorContext) {
    forEachItem(query, "given", context.jsonPath || "", (filter: string, path) => {
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
  private entityInSpecificationEntities(entity: string, jsonPath: string, context: FindQueryProcessorContext) {
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
    if (!asArray<JoinDirective>(this.getFindType(query)).includes(entity)) {
      throw new PathError(`filterBy entity [${entity}] must be in [${String(this.getFindKeyword())}]`, jsonPath, "filterBy");
    }
  }

  /**
   * Builds the query's URL.
   *
   * First, add all filters following the <pluralized_noun>/{<singularId>} syntax.
   * Then, if this is a findAll, add the pluralized_noun of the find
   *
   * @param query   The query to render.
   * @param context The execution context.
   *
   * @returns the query's URL.
   */
  protected buildUrl(query: T, context: FindQueryProcessorContext): Url {
    const urlBuilder = UrlBuilder.newBuilder();
    const pathBuilder = urlBuilder.path();

    const filters = asArray(query.given);

    // filterBy.forEach((filter) => {
    //   pathBuilder.withNoun(filter, !isSingleton(context.schemaRegistry.get(filter)));
    //   pathBuilder.withIdentifier(filter);
    // });

    // asArray(this.getFindType(query)).forEach((projection) => {
    //   let entity = Joins.viaFrom(projection);
    //   const fragment = context.schemaRegistry.getFragment(entity);
    //   if (fragment) {
    //     entity = Joins.viaFrom(fragment.on);
    //   }

    //   if (!filterBy.includes(entity)) {
    //     pathBuilder.withNoun(entity, !isSingleton(context.schemaRegistry.get(entity)));
    //   }
    // });

    let find;
    if (this.getFindKeyword() === "findAll") {
      find = [...filters, ...asArray<JoinDirective>(this.getFindType(query))];
    } else {
      find = [...filters];
    }

    if (find.length === 0) {
      throw new Error("nothing to find");
    }

    // Not all entities have edges, if we are only finding a root entity, then we don't need to check the dependency graph.
    if (find.length === 1) {
      const entity = Fragments.entity(Joins.viaFrom(find[0]), context.schemaRegistry);

      pathBuilder.withNoun(entity, !isSingleton(context.schemaRegistry.get(entity)));
      if (filters.includes(entity)) {
        pathBuilder.withIdentifier(entity);
      }
      return urlBuilder.build();
    }

    // At this point, we are following one or more edges, we must use the dependency graph to walk the route.
    let node: Node | undefined;
    for (let index = 0; index < find.length; index++) {
      const entity = Fragments.entity(Joins.viaFrom(find[index]), context.schemaRegistry);
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
  protected getSourceEntity(query: T, context: FindQueryProcessorContext): string {
    if (context.findDirective) {
      return context.findDirective.entity();
    }

    const find = [...asArray(query.given), ...asArray<JoinDirective>(this.getFindType(query))];
    const keyword = this.getFindKeyword() as string;

    if (find.length === 0) {
      throw new PathError("nothing to find", context.jsonPath || "", "find");
    }

    // Not all entities have edges, if we are only finding a root entity, then we don't need to check the dependency graph.
    if (find.length === 1) {
      return Fragments.entity(Joins.viaFrom(find[0]), context.schemaRegistry);
    }

    const findJsonPath = JsonPath.resolve(context.jsonPath || "", keyword);

    // At this point, we are following one or more edges, we must use the dependency graph to walk the route.
    let node: Node | undefined;
    for (let index = 0; index < find.length; index++) {
      const entity = Fragments.entity(Joins.viaFrom(find[index]), context.schemaRegistry);
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

  protected buildTag(query: T, context: FindQueryProcessorContext): string {
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

  protected getBaseSchemaObject(query: T, context: FindQueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    const findDirective = context.findDirective;
    if (!findDirective) {
      throw new Error("illegal state");
    }

    return findDirective.schema(context);
    //   let node = this.walkGiven(query, context);
    //   if( node ) {
    //     if( this.getFindKeyword() === "findOne" ) {
    //       const edge = Nodes.findEdge(node, this.getFindType(query))
    //     }

    //   }

    //   if( node ) {
    //     const edge = Nodes.findEdge(query[])
    //   }
    //   if( node ) {

    //     if( this.getFindType() === "findAll") {

    //     }

    //   }

    //   const sourceEntity = this.getSourceEntity(query, context);
    //   const find = [...asArray(query.given), ...asArray<JoinDirective>(this.getFindType(query))];
    //   // if (find.length <= 0) {
    //   //   throw new PathError("empty find", context.jsonPath || "", "find");
    //   // }

    //   // let schema: AnySchema;
    //   // const target = find[find.length - 1];
    //   // if (isEntityProjection(target)) {
    //   //   const entityProjection = target as EntityProjection;
    //   //   schema = EntityProjections.projectionSchema(
    //   //     entityProjection,
    //   //     context.schemaRegistry.get(Joins.viaFrom(entityProjection)),
    //   //     context.jsonPath || "",
    //   //     context,
    //   //   );
    //   // } else {
    //   //   schema = context.schemaRegistry.get(target as string);
    //   // }

    //   const source = find.pop();
    //   if (!source) {
    //     throw new PathError("could not determine source entity", context.jsonPath || "", String(this.getFindKeyword()));
    //   }

    //   const schema: EntitySchema = Joins.joinSchema(
    //     source,
    //     context.schemaRegistry.get(sourceEntity) as EntitySchema,
    //     context.jsonPath || "",
    //     context,
    //   ) as EntitySchema;

    //   if (!query.join) {
    //     if (Joins.isViaEntry(source)) {
    //       return entitySchemaRef(sourceEntity);
    //     }

    //     return asSchemaObject(schema);
    //   }

    //   const map = new Map<string, ObjectSchema>();
    //   // const schema: EntitySchema = context.schemaRegistry.get(sourceEntity);

    //   const sourceNode = context.graph.has(sourceEntity) ? context.graph.get(sourceEntity) : undefined;

    //   map.set(sourceEntity.toLowerCase(), schema);

    //   forEachItem(query, "join", context.jsonPath || "", (join: JoinDirective, path: string) => {
    //     const entity = Fragments.entity(Joins.viaFrom(join), context.schemaRegistry);
    //     if (!sourceNode) {
    //       throw new PathError(`cannot join on [${sourceEntity}] as it has zero relationships`, path, "join");
    //     }

    //     const edge = Nodes.findEdge(sourceNode, entity);
    //     if (!edge) {
    //       throw new PathError("could not determine join edge from join name " + entity, path, "join");
    //     }

    //     const edgeSchema = context.schemaRegistry.get(edge.node.name);
    //     if (!edgeSchema) {
    //       throw new PathError("could not find schema for join entity " + edge.name, path, "join");
    //     }

    //     map.set(entity.toLowerCase(), edgeSchema as ObjectSchema);
    //   });

    //   forEachItem(query, "join", context.jsonPath || "", (join: JoinDirective, path: string) => {
    //     const entity = Fragments.entity(Joins.viaFrom(join), context.schemaRegistry);

    //     if (!sourceNode) {
    //       throw new PathError("attempted to join on node with zero relationships", path, "join");
    //     }

    //     const edge = Nodes.findEdge(sourceNode, entity);
    //     if (!edge) {
    //       throw new PathError(`could not determine join edge from join name [${entity}]`, path, "join");
    //     }

    //     // Figure out which relationship this join is using.
    //     const container = map.get(sourceEntity);
    //     if (!container) {
    //       throw new PathError("could not find container", path, "join");
    //     }
    //     // const item = edge.node.name;

    //     // Figure out if the property is a collection;
    //     const isCollection = Cardinality.isToMany(edge.cardinality);
    //     // const alias = schemaRegistry.getAlias(item);

    //     const itemSchema = map.get(entity);
    //     if (!itemSchema) {
    //       throw new PathError("could not determine item schema", path, "join");
    //     }

    //     container.properties = container.properties || {};
    //     if (isCollection) {
    //       container.properties[jsonPropertyCase(edge.name)] = {
    //         type: "array",
    //         items: Joins.joinSchema(join, itemSchema, path, context),
    //       } as ArraySchema;
    //     } else {
    //       container.properties[jsonPropertyCase(edge.name)] = Joins.joinSchema(join, itemSchema, JsonPath.resolve(path, entity), context);
    //     }
    //   });

    //   return asSchemaObject(schema);
  }
}
