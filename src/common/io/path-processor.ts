import * as fs from "fs";
import * as path from "path";

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
  public processPath(filePath: string, ctx: C) {
    const absolutePath = path.resolve(this.basePath, filePath);
    this.doPath(absolutePath, ctx);
  }

  private doPath(filePath: string, ctx: C) {
    if (fs.lstatSync(filePath).isDirectory()) {
      this.doProcessDirectory(filePath, ctx);
    } else {
      this.doProcessFile(filePath, ctx);
    }
  }

  /**
   * Iterates through each item in a directory and processes the path.
   *
   * @param dirPath The directory path.
   * @param ctx     The file processor context.
   */
  private doProcessDirectory(dirPath: string, ctx: C) {
    fs.readdirSync(dirPath).forEach((filePath: string): void => {
      this.doPath(path.resolve(dirPath, filePath), ctx);
    });
  }

  /**
   * Invokes the inner file processor.
   *
   * @param filePath    The file path.
   * @param ctx         The file processor context.
   */
  private doProcessFile(filePath: string, ctx: C) {
    this.fileProcessor.processFile(filePath, ctx);
  }
}
