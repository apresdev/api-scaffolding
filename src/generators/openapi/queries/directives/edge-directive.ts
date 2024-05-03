import { OpenAPIV3 } from "openapi-types";
import { checkNotEmpty, checkNotNull, pluralize } from "../../../../common";
import { Cardinality, Edge, EntityName, RelationshipName } from "../../../../specification";
import { entitySchemaRef } from "../../util";
import { EntityDirective } from "./entity-directive";

/**
 * The edge directive is used to represent a relationship in the E-R model.  It refers to an entity by the relationship name from another
 * source entity.
 *
 * For example, a "student" entity may attend multiple "classes".  Here the edge name is "classes" and refers to a "class" entity.
 */
export class EdgeDirective implements EntityDirective {
  /**
   * The relationship name that was used to refer to the entity.
   */
  private readonly _source: RelationshipName;

  /**
   * The edge that represents the relationship.
   */
  private readonly _edge: Edge;

  /**
   * Creates an instance of an EdgeDirective.
   *
   * @param source  The relationship name that was used to refer to the entity.
   * @param edge    The edge that represents the relationship.
   */
  public constructor(source: RelationshipName, edge: Edge) {
    checkNotEmpty(source, "source must not be empty");
    checkNotNull(edge, "edge must not be null");

    this._source = source;
    this._edge = edge;
  }

  asIdentifier(): string {
    return this._source;
  }

  asCollection(): string {
    if (Cardinality.isToMany(this._edge.cardinality)) {
      return this._source;
    }

    return pluralize(this._source);
  }

  /**
   * Determines if the entity should be considered a singleton (i.e. a non-collection).
   *
   * @returns true if and only if the edge is a "to-one" relationship.
   */
  isSingleton(): boolean {
    return Cardinality.isToOne(this._edge.cardinality);
  }

  /**
   * Returns an OpenAPI schema reference to the edge node.
   *
   * @returns a reference to the schema for the edge node.
   */
  schema(): OpenAPIV3.ReferenceObject {
    return entitySchemaRef(this._edge.node.name);
  }

  path(): string {
    return this._source;
  }

  /**
   * Returns the name of the entity the edge connects to.
   *
   * @returns the name of the entity.
   */
  entity(): EntityName {
    return this._edge.node.name;
  }
}
