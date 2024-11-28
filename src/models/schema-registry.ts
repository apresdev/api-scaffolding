import { OpenAPIV3 } from "openapi-types";
import { Objects, toPascalCase } from "../common";
import { asSchemaObject } from "../entities";
import { AnySchema, EntitySchema, Fragment } from "../specification";
import { FileSchema } from "../specification/file";
import { deepCopy } from "../util";

/**
 * The schema registry stores all known schemas in the system.
 */
export class SchemaRegistry {
  /**
   * The internal storage of the schemas, indexed by entity name.
   */
  private readonly schemas: Map<string, EntitySchema>;
  private readonly aliases: Map<string, string>;
  private readonly files: Map<string, FileSchema>;
  private readonly fragments: Map<string, Fragment>;
  private readonly naturalIdenfiers: Set<string>;

  /**
   * Creates an instance of a SchemaRegistry.
   */
  constructor() {
    this.schemas = new Map<string, EntitySchema>();
    this.aliases = new Map<string, string>();
    this.files = new Map<string, FileSchema>();
    this.fragments = new Map<string, Fragment>();
    this.naturalIdenfiers = new Set<string>();
  }

  /**
   * Adds a schema to the registry.
   *
   * @param entity The name of the entity.
   * @param schema The entity's schema.
   */
  public set<T extends AnySchema>(entity: string, schema: T) {
    // Store a copy of the schema, to prevent the caller from manipulating the schema post-insert.
    this.schemas.set(toPascalCase(entity), deepCopy(schema) as EntitySchema);
  }

  /**
   * Adds a file schema to the registry.
   *
   * @param name The name of the file type.
   * @param schema The file's schema.
   */
  public setFile(name: string, schema: FileSchema) {
    // Store a copy of the schema, to prevent the caller from manipulating the schema post-insert.
    this.files.set(toPascalCase(name), deepCopy(schema) as FileSchema);

    if (schema.alias) {
      this.setAlias(name, schema.alias);
    }
  }

  /**
   * Lookup a the schema for a given entity.
   *
   * @param entity The name of the entity.
   * @returns The entity's schema.
   */
  public get<T extends AnySchema>(entity: string): T {
    if (!this.has(entity)) {
      throw new Error(`unknown entity ${entity}`);
    }
    // Return a copy of the schema to prevent the caller from manipulating the internal representation.
    return deepCopy(this.schemas.get(toPascalCase(entity))) as T;
  }

  /**
   * Lookup a the schema for a given entity.
   *
   * @param entity The name of the entity.
   * @returns The entity's schema.
   */
  public getFile(file: string): FileSchema {
    if (!this.hasFile(file)) {
      throw new Error(`unknown file ${file}`);
    }

    // Return a copy of the schema to prevent the caller from manipulating the internal representation.
    return Objects.requireNonNull(deepCopy(this.files.get(toPascalCase(file))));
  }

  /**
   * Determines if a schema already exists for a given entity.
   *
   * @param entity The name of the entity.
   * @returns true if and only if a schema exists with the given entity name.
   */
  public has(entity: string): boolean {
    return this.schemas.has(toPascalCase(entity));
  }

  /**
   * Determines if a file schema already exists for a given file schema name.
   *
   * @param entity The name of the file schema.
   * @returns true if and only if a schema exists with the given file name.
   */
  public hasFile(file: string): boolean {
    return this.files.has(toPascalCase(file));
  }

  /**
   * Marks a schema to indicate that it has a natural identifier.
   *
   * @param entity The name of the entity.
   */
  public markNaturalIdentifier(entity: string) {
    this.naturalIdenfiers.add(toPascalCase(entity));
  }

  /**
   * Sets the alias for an entity.
   *
   * @param entity  The name of the entity.
   * @param alias   The alias for the entity.
   */
  public setAlias(entity: string, alias: string) {
    this.aliases.set(entity, alias);
  }

  /**
   * Retrieves the alias for a given entity.
   *
   * @param entity The name of the entity.
   * @returns The alias for the entity or the entity name if no alias exists.
   */
  public getAlias(entity: string): string {
    return this.aliases.get(entity) || entity;
  }

  /**
   * Determines if a schema is known to have a natural identifier.
   *
   * @param entity The name of the entity.
   * @returns true if and only if a schema exists and has a natural idenfier schema defined.
   */
  public hasNaturalIdentifier(entity: string): boolean {
    return this.naturalIdenfiers.has(toPascalCase(entity));
  }

  /**
   * Executes a provided function once per each entity/schema pair in the registry, in insertion order.
   *
   * @param callbackFn The iterator callback.
   */
  public entries(): MapIterator<[string, EntitySchema]> {
    return this.schemas.entries();
  }

  public registerFragment(fragment: Fragment): void {
    this.fragments.set(fragment.name, fragment);
  }

  public getFragment(name: string): Fragment | undefined {
    return this.fragments.get(name);
  }

  public resolve(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): OpenAPIV3.SchemaObject {
    if ("$ref" in schema) {
      const entity = schema.$ref.split("/").pop() as string;
      const resolvedSchema = this.get(entity);
      return this.resolve(asSchemaObject(resolvedSchema));
    }

    return schema;
  }
}
