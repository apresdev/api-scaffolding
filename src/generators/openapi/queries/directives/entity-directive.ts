import { OpenAPIV3 } from "openapi-types";
import { EntityName } from "../../../../specification";
import { QueryProcessorContext } from "../query-generator";

export interface EntityDirective {
  asCollection(context: QueryProcessorContext): string;
  asIdentifier(context: QueryProcessorContext): string;

  /**
   * The name of the path element as it should appear in the URL path.
   */
  path(): string;

  /**
   * The name of the entity the directive refers to.
   */
  entity(): EntityName;

  /**
   * The schema the represents the directive.
   */
  schema(context: QueryProcessorContext): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

  isSingleton(context: QueryProcessorContext): boolean;
}
