import { lstatSync, readdirSync } from "node:fs";
import path from "node:path";

import { FileProcessor } from ".";

/**
 * The PathProcessor is used to iterate over paths and invoke an inner file processor on each item found it the given path.
 *
 * If the path is a directory, then the path processor will invoke the inner file processor on each file in the given path.
 *
 * If the path is a file, then the path processor will invoke the inner file processor on the given path.
 */
export class PathProcessor<T, C> {
  /**
   * The base path where path resolution should occur
   */
  private readonly basePath: string;

  /**
   * The inner file processor used to process files.
   */
  private readonly fileProcessor: FileProcessor<T, C>;

  /**
   * Creates an instance of a FileProcessor.
   *
   * @param fileProcessor   The inner file processor used to process files.
   */
  public constructor(basePath: string, fileProcessor: FileProcessor<T, C>) {
    this.basePath = basePath;
    this.fileProcessor = fileProcessor;
  }

  /**
   *
   * @param filePath Processes
   * @param ctx
   */
  public processPath(filePath: string, context: C) {
    const absolutePath = path.resolve(this.basePath, filePath);
    this.doPath(absolutePath, context);
  }

  private doPath(filePath: string, context: C) {
    if (lstatSync(filePath).isDirectory()) {
      this.doProcessDirectory(filePath, context);
    } else {
      this.doProcessFile(filePath, context);
    }
  }

  /**
   * Iterates through each item in a directory and processes the path.
   *
   * @param directoryPath The directory path.
   * @param ctx     The file processor context.
   */
  private doProcessDirectory(directoryPath: string, context: C) {
    for (const filePath of readdirSync(directoryPath)) {
      this.doPath(path.resolve(directoryPath, filePath), context);
    }
  }

  /**
   * Invokes the inner file processor.
   *
   * @param filePath    The file path.
   * @param ctx         The file processor context.
   */
  private doProcessFile(filePath: string, context: C) {
    this.fileProcessor.processFile(filePath, context);
  }
}
