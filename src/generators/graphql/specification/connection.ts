import { TypeName } from ".";
import { toPascalCase } from "../../../common";

export type ConnectionName = string;

export interface Connection {
  name: ConnectionName;
  origin: TypeName;
  destination: TypeName;
}

export function generateConnection(connection: Connection): string {
  return `${generateEdge} 

type ${generateConnectionName(connection)}{
  pageInfo: PageInfo!
  edges: [${generateEdgeName(connection)}]
}`;
}

export type EdgeName = string;
export interface Edge {
  name: EdgeName;
  type: TypeName;
}

export function generateEdge(connection: Connection): string {
  return `type ${generateEdgeName(connection)}{
  cursor: String!
  node: ${toPascalCase(connection.destination)}
}`;
}

export function generateConnectionName(connection: Connection): EdgeName {
  return `${toPascalCase(connection.origin)}${toPascalCase(connection.name)}Connection`;
}

function generateEdgeName(connection: Connection): EdgeName {
  return `${toPascalCase(connection.origin)}${toPascalCase(connection.name)}Edge`;
}
