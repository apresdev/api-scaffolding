import * as path from "path";

import Ajv, { Schema, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import ajvKeywords from "ajv-keywords";
import SourceMap from "js-yaml-source-map";
import { read } from "yaml-import";

const ajv = new Ajv();
addFormats(ajv);
ajvKeywords(ajv);

export type Severity = "warning" | "error";
export type ProcessingErrors = Array<ProcessingError>;
export interface ProcessingError {
  line: number;
  column: number;
  severity: Severity;
  keyword: string;
  message: string;
  path: string;
}

export interface LoadResult<T> {
  model: T;
  errors?: ProcessingErrors;
  sourceMap: SourceMap;
}

export class UnknownEntityError extends Error {
  private readonly _entity: string;
  public constructor(entity: string) {
    super(`unknown entity ${entity}`);
    this._entity = entity;
  }

  public get entity(): string {
    return this._entity;
  }
}

export interface SourceLocation {
  line: number;
  column: number;
  position: number;
}

export class SourceMaps {
  private readonly sourceMaps: Map<string, SourceMap> = new Map<string, SourceMap>();

  set(entity: string, map: SourceMap): void {
    this.sourceMaps.set(entity, map);
  }

  public getLocation(entity: string, path: string | string[]): SourceLocation | undefined {
    const map = this.sourceMaps.get(entity);
    if (!map) {
      throw new UnknownEntityError(entity);
    }

    return map.lookup(path);
  }
}

export class SchemaValidator<T> {
  private readonly schema: Schema;
  private readonly sourceMaps: SourceMaps;
  private readonly validatorFn: ValidateFunction<T>;

  /**
   *
   * @param schemaPath The path to the JSON schema file.
   */
  public constructor(schema: Schema, sourceMaps: SourceMaps) {
    this.schema = schema;
    this.sourceMaps = sourceMaps;
    this.validatorFn = ajv.compile(schema);
  }

  public loadYaml(yamlSource: string): LoadResult<T> {
    const absolutePath = path.resolve(yamlSource);
    const sourceMap = new SourceMap();
    // const data = fs.readFileSync(absolutePath, "utf8");

    // Load the model with the source map.
    const model = read(absolutePath, { listener: sourceMap.listen() }) as T;
    const errors: ProcessingErrors = [];

    this.sourceMaps.set(yamlSource, sourceMap);

    // Validate the loaded model.
    const results = this.validatorFn(model);
    if (!results) {
      for (const error of this.validatorFn.errors || []) {
        const jsonPointer = error.instancePath.split("/");
        const location = sourceMap.lookup(jsonPointer);

        const paramKeys = Object.keys(error.params);
        let keyword: string = error.keyword;
        if (paramKeys.length > 0) {
          keyword = Object.keys(error.params)
            .map((key: string) => `${key}: ${String(error.params[key])}`)
            .join(", ");
        }

        errors.push({
          line: location?.line || 0,
          column: location?.column || 0,
          severity: "error",
          keyword: keyword,
          message: error.message || "",
          path: error.instancePath
            .split("/")
            .filter((s) => s.length !== 0)
            .join("."),
        });
      }
    }

    return {
      model,
      errors: errors.length > 0 ? errors : undefined,
      sourceMap,
    };
  }
}

export class FileErrors {
  private readonly fileErrors: Record<string, ProcessingErrors> = {};
  private errorsExist = false;

  public withErrors(sourcePath: string, errors: ProcessingErrors) {
    const absolutePath = path.resolve(sourcePath);
    this.errorsExist = true;
    this.fileErrors[absolutePath] = [...(this.fileErrors[absolutePath] || []), ...errors];
  }

  public hasErrors(): boolean {
    return this.errorsExist;
  }

  public forEach(iterator: (file: string, errors: Iterable<ProcessingError>) => void): void {
    for (const filename in this.fileErrors) {
      iterator(filename, this.fileErrors[filename]);
    }
  }
}

export async function logErrors(result: FileErrors) {
  result.forEach((filename, errors) => {
    console.log(underline(filename));

    for (const error of errors) {
      const position = `${error.line}:${error.column}`;
      const color = error.severity === "error" ? red : yellow;
      console.log(
        ` ${position.padEnd(8, " ")} ${color(error.severity.padEnd(8, " "))} ${error.keyword.padEnd(35, " ")} ${error.message?.padEnd(
          54,
          " ",
        )} ${error.path}`,
      );
    }
    console.log();
  });
}

export function underline(value: string): string {
  return `\x1b[4m${value}\x1b[0m`;
}

export function red(value: string): string {
  return `\x1b[31m${value}\x1b[0m`;
}

export function yellow(value: string): string {
  return `\x1b[33m${value}\x1b[0m`;
}
