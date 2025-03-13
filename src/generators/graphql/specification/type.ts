import { description, Field, indent, processField } from ".";
import { toCamelCase, toPascalCase } from "../../../common";
import { Connection, generateConnectionName } from "./connection";
import { InterfaceName } from "./interface";

export type TypeName = string;

export interface Type {
  /**
   * The name of the type.
   */
  name: TypeName;
  /**
   * The optional interface that the type implements.
   */
  implements?: InterfaceName;
  /**
   * The fields.
   */
  fields: Field[];
  /**
   * The connections to other nodes.
   */
  connections?: Connection[];
  /**
   * A human-readable description of the type.
   */
  description?: string;
}

/**
 * Generates a GraphQL type.
 * @param type The type specification to generate.
 * @returns The string representation of the type in GraphQL specification syntax.
 */
export function generateType(type: Type): string {
  let contents = "";

  if (type.description) {
    contents += description(type.description);
  }

  contents += `type ${toPascalCase(type.name)} ${generateImplements(type)}{\n${generateFields(type)}${generateConnections(type)}}`;

  return contents;
}

function generateImplements(type: Type): string {
  if (!type.implements) {
    return "";
  }

  return `implements ${toPascalCase(type.implements)}`;
}

function generateFields(type: Type): string {
  return type.fields
    .flatMap((f) => {
      const contents = [];
      if (f.description) {
        // Add the field description.
        contents.push(...description(f.description).split("\n"));
      }
      contents.push(processField(f));
      return contents;
    })
    .map((s) => indent(s, 1)) // indent
    .join("\n");
}

function generateConnections(type: Type): string {
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
