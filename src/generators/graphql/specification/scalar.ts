import { toPascalCase } from "../../../common";

export type ScalarName = string;
export interface Scalar {
  name: ScalarName;
}

export function generateScalar(scalar: Scalar): string {
  return `scalar ${toPascalCase(scalar.name)}`;
}
