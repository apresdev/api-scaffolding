type Source = string;
type Sources = string[];
type Destination = string;

/**
 * Used to track $ref references within an OpenAPI document.
 */
export class References {
  /**
   * The internal index of references.
   */
  private references: Map<Destination, Sources>;

  /**
   * Creates an instance of a References object.
   */
  constructor() {
    this.references = new Map<Destination, Sources>();
  }

  /**
   * Looks up a given destination $ref value.  Filters out any nested (self-referential) references and returns true if at least one non-self-reference
   * exists.
   *
   * @param dest The destination reference to lookup.
   * @returns true if and only if there exists at least one reference that is not a self reference.
   */
  public has(destination: Destination): boolean {
    const sources = this.references.get(destination);
    if (!sources) {
      return false;
    }

    return sources.filter((source) => !source.startsWith(`${destination}/`))?.length > 0;
  }

  /**
   * Analyzes a given value and indexes all references found within the value.
   *
   * @param value   The value to analyze.
   * @param path    The current URI path within the document
   */
  public analyze<T>(value: T, path: Source = "#"): void {
    if (!value) {
      return;
    }

    if (typeof value !== "object" && !Array.isArray(value)) {
      return;
    }

    if (Array.isArray(value)) {
      for (const [index, subValue] of value.entries()) this.analyze(subValue, `${path}/${index}`);
      return;
    }

    if ("$ref" in value) {
      const reference: string = value["$ref"] as string;
      this.addReference(
        reference
          .split("/")
          .filter((v, index) => index < 4)
          .join("/"),
        path,
      );
    }

    for (const property of Object.keys(value)) {
      this.analyze((value as Record<string, unknown>)[property], `${path}/${encodeURIComponent(property)}`);
    }
  }

  /**
   * Adds a reference to the document.
   *
   * @param dest    The destination URI
   * @param src     The source URI.
   */
  private addReference(destination: Destination, source: Source): void {
    if (!this.references.has(destination)) {
      this.references.set(destination, []);
    }

    this.references.get(destination)?.push(source);
  }
}
