import { JsonPath } from "../../../../common";
import { PathError } from "../../../../common/io";
import { EntityName, EntityProjection, FindQuery, FragmentName, Node, Nodes, RelationshipName } from "../../../../specification";
import { Joins } from "../../../../specification/joins";
import { asArray } from "../../util";
import { FindQueryProcessorContext } from "../find-query";
import { QueryProcessorContext } from "../query-generator";
import { EdgeDirective } from "./edge-directive";
import { EntityDirective } from "./entity-directive";
import { EntityNameDirective } from "./entity-name-directive";
import { EntityProjectionDirective } from "./entity-projection-directive";
import { FragmentDirective } from "./fragment-directive";
import { NodeDirective } from "./node-directive";

/**
 * The first item in a given must always
 *
 * @param query
 * @param context
 */
export function compileDirectives<T extends FindQuery, K extends keyof T>(query: T, keyword: K, context: FindQueryProcessorContext): void {
  let node: Node | undefined;

  context.givenDirectives = [];

  if (query.given) {
    node = compileGiven(query, context.givenDirectives, context);
  }

  context.findDirective = compileFind(query, keyword, node, context);
}

export function compileFind<T extends FindQuery, K extends keyof T>(
  query: T,
  keyword: K,
  node: Node | undefined,
  context: QueryProcessorContext,
): EntityDirective {
  const find = query[keyword];
  let entityDirective: EntityDirective;
  if (typeof find === "string") {
    entityDirective = compileName<T, K>(find, keyword, node, context);
  } else {
    const entityProjection = find as EntityProjection;
    const nameDirective = compileName<T, K>(Joins.viaFrom(entityProjection), keyword, node, context);
    entityDirective = new EntityProjectionDirective(entityProjection, nameDirective);
  }

  // if (node) {
  //   const edge = Nodes.findEdge(node, entityDirective.path());
  //   if (!edge) {
  //     throw new PathError("detected unsupported edge", JsonPath.resolve(context.jsonPath || "", String(keyword)), String(keyword));
  //   }
  // }

  return entityDirective;
}

export function compileName<T extends FindQuery, K extends keyof T>(
  find: EntityName | RelationshipName | FragmentName,
  keyword: K,
  node: Node | undefined,
  context: QueryProcessorContext,
): EntityDirective {
  let entityDirective: EntityDirective;

  const fragment = context.schemaRegistry.getFragment(find);
  if (fragment) {
    entityDirective = new FragmentDirective(fragment);
  } else if (context.schemaRegistry.has(find)) {
    entityDirective = new EntityNameDirective(find);
  } else {
    if (!node) {
      throw new PathError("detected node with no edges", JsonPath.resolve(context.jsonPath || "", String(keyword)), String(keyword));
    }

    const edge = Nodes.findEdge(node, find);
    if (!edge) {
      throw new PathError("detected unsupported edge", JsonPath.resolve(context.jsonPath || "", String(keyword)), String(keyword));
    }
    entityDirective = new EdgeDirective(find, edge);
  }

  return entityDirective;
}

export function compileGiven<T extends FindQuery>(
  query: T,
  directives: Array<EntityDirective>,
  context: QueryProcessorContext,
): Node | undefined {
  let node: Node | undefined;
  if (query.given) {
    directives.push(
      ...asArray(query.given).map((term: EntityName, index: number) => {
        switch (index) {
          case 0:
            node = context.graph.get(term);
            if (node) {
              return new NodeDirective(node);
            }
            break;
          default: {
            if (!node) {
              throw new PathError("detected node with no edges", JsonPath.resolve(context.jsonPath || "", "given", "0"), "given");
            }

            const edge = Nodes.findEdge(node, term);
            if (!edge) {
              throw new PathError("detected unsupported edge", JsonPath.resolve(context.jsonPath || "", "given", String(index)), "given");
            }
            node = edge.node;

            return new EdgeDirective(term, edge);
          }
        }

        return new EntityNameDirective(term);
      }),
    );
  }

  return node;
}
