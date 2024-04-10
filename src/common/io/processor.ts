import SourceMap from "js-yaml-source-map";
import * as path from "path";
import { FileErrors, SchemaValidator } from "..";
import { PathError } from "./errors";

export type FileProcessorContext<C> = {
  path: string;
  sourceMap: SourceMap;
} & C;

export type JsonPath = string;

export abstract class FileProcessor<T, C> {
  private readonly schemaValidator: SchemaValidator<T>;
  protected readonly fileErrors: FileErrors;

  constructor(schemaValidator: SchemaValidator<T>, fileErrors: FileErrors) {
    this.schemaValidator = schemaValidator;
    this.fileErrors = fileErrors;
  }

  /**
   *
   * @param filePath    The path to the file to be processed.
   * @returns
   */
  public processFile(filePath: string, ctx: C) {
    const basePath = path.resolve(filePath);
    const { model, errors, sourceMap } = this.schemaValidator.loadYaml(basePath);

    if (errors && errors.length > 0) {
      this.fileErrors.withErrors(basePath, errors);
      return;
    }

    const context: FileProcessorContext<C> = {
      ...ctx,
      path: basePath,
      sourceMap,
    };

    try {
      this.processModel(model, context);
    } catch (err) {
      if (typeof err === "string") {
        this.withError("", "unknown", err, context);
        return;
      }
      if (typeof err === "object" && err && "path" in err) {
        const pathError = err as PathError;
        this.withError(pathError.path, "unknown", pathError.message, context);
        return;
      }
      this.withError("", "unknown", (err as Error).message, context);
    }
  }

  /**
   * Processed the parsed model, only called if the model passed all schema validitity checks.
   *
   * @param model   The parsed model.
   * @param context The file processing context.
   */
  protected abstract processModel(model: T, context: FileProcessorContext<C>): void;

  /**
   * Registers an individual error within a file.
   *
   * @param path    The dotted json path locating where the error was detected.
   * @param keyword The general keyword for the error.
   * @param message The error message.
   * @param context The file processing context.
   */
  protected withError(path: JsonPath, keyword: string, message: string, context: FileProcessorContext<C>): void {
    // Prepare the JSON path for the lookup
    const parts = path.split(".");
    if (parts.length > 0) {
      // There is a weird bug in js-yaml-source-map that doesn't include 0 in the first item.
      if (parts[0] === "0") {
        parts.shift();
      }
    }

    const location = context.sourceMap.lookup(parts);
    this.fileErrors.withErrors(context.path, [
      {
        line: location?.line || 0,
        column: location?.column || 0,
        severity: "error",
        keyword,
        message,
        path,
      },
    ]);
  }
}
