import {
  Connection,
  ConnectionName,
  Enum,
  EnumName,
  generateConnection,
  generateEnum,
  generateInterface,
  generateScalar,
  generateType,
  Interface,
  InterfaceName,
  Scalar,
  ScalarName,
  Type,
  TypeName,
} from ".";

export interface GraphQLSpecification {
  scalars: Record<ScalarName, Scalar>;
  enums: Record<EnumName, Enum>;
  connections: Record<ConnectionName, Connection>;
  types: Record<TypeName, Type>;
  interfaces: Record<InterfaceName, Interface>;
}

export function generateSpecification(specification: GraphQLSpecification): string {
  return `
${generateScalars(specification)}
${generateEnums(specification)}
${generateConnections(specification)}
${generateInterfaces(specification)}
${generateTypes(specification)}
`;
}

function generateScalars(specification: GraphQLSpecification): string {
  return Object.values(specification.scalars)
    .map((v) => generateScalar(v))
    .join("\n");
}

function generateEnums(specification: GraphQLSpecification): string {
  return Object.values(specification.enums)
    .map((v) => generateEnum(v))
    .join("\n");
}

function generateConnections(specification: GraphQLSpecification): string {
  return Object.values(specification.connections)
    .map((v) => generateConnection(v))
    .join("\n");
}

function generateInterfaces(specification: GraphQLSpecification): string {
  return Object.values(specification.interfaces)
    .map((v) => generateInterface(v))
    .join("\n");
}

function generateTypes(specification: GraphQLSpecification): string {
  return Object.values(specification.types)
    .map((v) => generateType(v))
    .join("\n");
}
