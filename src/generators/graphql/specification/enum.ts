import { toPascalCase } from "../../../common";

export type EnumName = string;
export interface Enum {
  name: EnumName;
  values: string[];
}

export function generateEnum(enumeration: Enum): string {
  return `enum ${toPascalCase(enumeration.name)}{\n${enumeration.values.map((v) => generateEnumeratedValue(v)).join("\n")}}`;
}

export function generateEnumeratedValue(value: string): string {
  return `  ${value}`;
}
