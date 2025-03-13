import { EnumName, ScalarName, TypeName } from ".";
import { toPascalCase } from "../../../common";

export type IntScalar = "Int";
export type FloatScalar = "Float";
export type StringScalar = "String";
export type BooleanScalar = "Boolean";
export type IdScalar = "ID";

export type DefaultScalarType = IntScalar | FloatScalar | StringScalar | BooleanScalar | IdScalar;
export type ScalarType = DefaultScalarType | ScalarName;

export interface DataType {
  nonNull?: boolean;
}

export interface ScalarDataType extends DataType {
  scalar: ScalarType;
}

export interface ListDataType extends DataType {
  items: DataType;
}

export interface EnumDataType extends DataType {
  enum: EnumName;
}

export interface ObjectDataType extends DataType {
  type: TypeName;
}

export function id(): ScalarDataType {
  return {
    scalar: "ID",
  };
}
export function bool(): ScalarDataType {
  return {
    scalar: "Boolean",
  };
}

export function nonNull(type: DataType): DataType {
  type.nonNull = true;
  return type;
}

export function processDataType(dataType: DataType): string {
  let result: string = "";

  if ("scalar" in dataType) {
    result = processScalarDataType(dataType as ScalarDataType);
  } else if ("enum" in dataType) {
    result = processEnumDataType(dataType as EnumDataType);
  } else if ("items" in dataType) {
    result = processListDataType(dataType as ListDataType);
  } else if ("type" in dataType) {
    result = processObjectDataType(dataType as ObjectDataType);
  } else {
    throw new Error(`unsupported data type: ${JSON.stringify(dataType)}`);
  }

  if (dataType.nonNull) {
    result += "!";
  }
  return result;
}

export function processScalarDataType(scalar: ScalarDataType): string {
  return toPascalCase(scalar.scalar);
}

export function processEnumDataType(scalar: EnumDataType): string {
  return toPascalCase(scalar.enum);
}

export function processObjectDataType(scalar: ObjectDataType): string {
  return toPascalCase(scalar.type);
}

export function processListDataType(listDataType: ListDataType): string {
  return `[${processDataType(listDataType.items)}]`;
}
