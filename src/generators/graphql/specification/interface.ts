import { Field, processField } from ".";
import { toCamelCase, toPascalCase } from "../../../common";
import { Connection, generateConnectionName } from "./connection";

export type InterfaceName = string;

export interface Interface {
  /**
   * The name of the type.
   */
  name: InterfaceName;
  /**
   * The fields.
   */
  fields: Field[];
  /**
   * The connections to other nodes.
   */
  connections?: Connection[];
}

/**
 * Generates a GraphQL type.
 * @param type The type specification to generate.
 * @returns The string representation of the type in GraphQL specification syntax.
 */
export function generateInterface(type: Interface): string {
  return `type ${toPascalCase(type.name)} {\n${generateFields(type)}${generateConnections(type)}}`;
}

function generateFields(type: Interface): string {
  return type.fields.map((f) => `  ${processField(f)}`).join("\n");
}

function generateConnections(type: Interface): string {
  if (!type.connections) {
    return "";
  }

  return type.connections
    .map(
      (c) => `  ${toCamelCase(c.name)}(
    first: Int,
    after: String,
    last: Int,
    before: String
  ): ${generateConnectionName(c)}`,
    )
    .join("\n");
}
