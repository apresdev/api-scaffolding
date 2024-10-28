import { Arrays, pluralize, toCamelCase } from "../common";
import { SchemaRegistry } from "../models";

import { getOrSet } from "./util";

import { Cardinality, EntityName, RelationshipType, ServiceSpecification } from ".";

export interface Node {
  name: EntityName;
  parent?: Edge;
  children: Set<Edge>;
  aggregations: Set<Edge>;
}

/**
 * Helper functions for working with Nodes.
 */
export class Nodes {
  /**
   * Hide the constructor of the utility class.
   */
  private constructor() {
    throw new Error("assertion error");
  }

  /**
   * Given a node find the edge that best matches the given name.  The name can either refer to a node name or an edge name.
   *
   * @param node  The node to analyze.
   * @param name  The name of the node or edge to find amongst the node's edges.
   *
   * @returns the edge that best matches the supplied name, or undefined if no such edge exists.
   */
  public static findEdge(node: Node, name: string): Edge | undefined {
    const edges: Edge[] = [];
    if (node.parent) {
      edges.push(node.parent);
    }
    if (node.children) {
      edges.push(...node.children);
    }
    if (node.aggregations) {
      edges.push(...node.aggregations);
    }

    return edges.find((edge: Edge): boolean => {
      return toCamelCase(edge.node.name) === toCamelCase(name) || toCamelCase(edge.name) === toCamelCase(name);
    });
  }
}

export interface Edge {
  type: RelationshipType;
  cardinality: Cardinality;
  node: Node;
  name: string;
}

export interface Connection {
  edges: Node[];
}

export interface Ancestor {
  name: string;
  isCollection: boolean;
}
export type Ancestry = Ancestor[];

export function buildGraph(service: ServiceSpecification, schemaRegistry: SchemaRegistry): DependencyGraph {
  const nodes: Map<string, Node> = new Map<string, Node>();

  for (const relationship of Arrays.orEmpty(service.relationships)) {
    const left: Node = getOrSet(nodes, sanitizeKey(relationship.left), asNode);
    const right: Node = getOrSet(nodes, sanitizeKey(relationship.right), asNode);

    switch (relationship.type) {
      case RelationshipType.COMPOSITION: {
        right.parent = {
          type: relationship.type,
          cardinality: Cardinality.reverse(relationship.cardinality),
          node: left,
          name: relationship.name || (Cardinality.isFromMany(relationship.cardinality) ? pluralize(relationship.left) : relationship.left),
        };

        left.children.add({
          type: relationship.type,
          cardinality: relationship.cardinality,
          node: right,
          name: relationship.name || (Cardinality.isToMany(relationship.cardinality) ? pluralize(relationship.right) : relationship.right),
        });
        break;
      }

      case RelationshipType.ASSOCIATION:
      case RelationshipType.AGGREGATION: {
        left.aggregations.add({
          type: relationship.type,
          cardinality: relationship.cardinality,
          node: right,
          name: relationship.name || (Cardinality.isToMany(relationship.cardinality) ? pluralize(relationship.right) : relationship.right),
        });

        right.aggregations.add({
          type: relationship.type,
          cardinality: Cardinality.reverse(relationship.cardinality),
          node: left,
          name: Cardinality.isFromMany(relationship.cardinality) ? pluralize(relationship.left) : relationship.left,
        });
        break;
      }
    }
  }

  return new DependencyGraph(nodes, schemaRegistry);
}

export class DependencyGraph {
  /**
   * The internal representation of the dependency graph.
   */
  private readonly graph: Map<string, Node>;
  private readonly schemaRegistry: SchemaRegistry;

  /**
   * Creates an instance of a DependencyGraph.
   *
   * @param graph The internal representation of the dependency graph.
   */
  constructor(graph: Map<string, Node>, schemaRegistry: SchemaRegistry) {
    this.graph = graph;
    this.schemaRegistry = schemaRegistry;
  }

  public has(entity: string): boolean {
    return this.graph.has(sanitizeKey(entity));
  }

  public get(entity: string): Node {
    const node = this.graph.get(sanitizeKey(entity));
    if (!node) {
      throw new Error(`unknown entity ${entity}`);
    }

    return node;
  }

  /**
   * Finds the collection of ancestral entities (parents, grandparents, great grandparents, etc.).
   *
   * The parent child relation ship is established through the "composition" relationship type, where the left node represents the parent, * and the right node represents the child.
   *
   * @param entity The entity name to lookup.
   * @returns The collection of ancestral entities.
   */
  public listAncestors(entity: string): Ancestry {
    const ancestors: Ancestry = [];
    let node = this.graph.get(sanitizeKey(entity));

    if (!node) {
      // We've detected a node with zero-relationships defined.
      return [];
    }

    do {
      if (node.parent) {
        ancestors.push({
          name: node.parent.node.name,
          isCollection: this.isCollection(node.parent.node.name),
        });
        node = this.graph.get(node.parent.node.name);
      } else {
        node = undefined;
      }
    } while (node);

    return ancestors.reverse();
  }

  /**
   * All writeable entities should have a "natural" mutation operation.  The "natural" mutation operation should consider the parent-child
   * relationships the entity has due to composition relationships.
   *
   * If the entity has a "to-many" relationship from it's parent entity, then this entity should be treated as a collection.
   * If the entity has a "to-one" relationship from it's parent entity, then this entity should be treated as a singleton-per-parent.
   *
   * If this entity does not have a parent, then this is a root entity, and we will treat is as a collection, unless the entity is marked
   * as a singleton (only one global instance.)
   *
   * @param entity The entity to lookup.
   *
   * @returns  true if and only if the entity should be treated as a collection for mutation purposes.
   */
  public isCollection(entity: string): boolean {
    const node = this.graph.get(sanitizeKey(entity));

    if (node && node.parent) {
      return Cardinality.isFromMany(node.parent.cardinality);
    }

    const schema = this.schemaRegistry.get(entity);
    if (schema && "singleton" in schema) {
      return schema.singleton !== true;
    }

    // We will assume that most entities are collections.
    return true;
  }

  /**
   * Finds the collection of ancestral entities (parents, grandparents, great grandparents, etc.).
   *
   * The parent child relation ship is established through the "composition" relationship type, where the left node represents the parent, * and the right node represents the child.
   *
   * @param entity The entity name to lookup.
   * @returns The collection of ancestral entities.
   */
  public findListAssociations(entity: string): string[] {
    const node = this.graph.get(sanitizeKey(entity));
    if (!node) {
      throw new Error(`unknown entity detected ${entity}`);
    }

    return [...node.aggregations]
      .filter((edge) => edge.type === RelationshipType.AGGREGATION)
      .filter((edge) => Cardinality.isToMany(edge.cardinality))
      .map((edge) => edge.node.name);
  }
}

function sanitizeKey(key: string): string {
  return key.toLowerCase();
}

/**
 * Creates a new node from a given entity name.
 *
 * @param name The name of the node.
 * @returns The new node.
 */
function asNode(name: string): Node {
  return {
    name,
    children: new Set(),
    aggregations: new Set(),
  };
}
