import path from "node:path";

import { Arrays, Objects, pluralize, toPascalCase } from "../common";
import { FileProcessor, FileProcessorContext } from "../common/io";
import { FileErrors, SchemaValidator, SourceMaps } from "../common/schema";
import { Cardinality, FileSchema, Link, Relationship, RelationshipType, ServiceSpecification, getServicePath } from "../specification";

import { SchemaRegistry } from "./schema-registry";

/* eslint-disable import/no-namespace */
import { isSingleton } from "../entities";
import * as entitySchema from "../schemas/file.json";
/* eslint-enable import/no-namespace */

const sourceMaps = new SourceMaps();

const fileValidator = new SchemaValidator<FileSchema>(entitySchema, sourceMaps);

export function loadFiles(service: ServiceSpecification, schemaRegistry: SchemaRegistry, results: FileErrors): void {
  // Short circuit execution if no files are specified.
  if (!service.files) {
    return;
  }

  const modelProcessor = new FileSchemaProcessor(service, schemaRegistry, results);

  for (const entity of service.files) {
    modelProcessor.processFile(toFileSchemaPath(entity), { entity });
  }

  // Post-process the relationships.
  for (const relationship of Objects.requireNonNull(service.relationships)) {
    defaultRelationshipName(relationship);
  }
}

interface FileSchemaProcessorContext {
  entity: string;
}

class FileSchemaProcessor extends FileProcessor<FileSchema, FileSchemaProcessorContext> {
  private readonly service: ServiceSpecification;
  private readonly schemaRegistry: SchemaRegistry;

  constructor(service: ServiceSpecification, schemaRegistry: SchemaRegistry, fileErrors: FileErrors) {
    super(fileValidator, fileErrors);
    this.service = service;
    this.schemaRegistry = schemaRegistry;
  }

  protected processModel(fileSchema: FileSchema, context: FileProcessorContext<FileSchemaProcessorContext>): void {
    // Load the base model definition.  This should include all user-defined properties
    // const inputModel = loadEntity(entity, schemaRegistry, results);

    const hasNaturalIdentifier = fileSchema.name !== undefined;

    // Process and set the model identifier.
    this.preProcessInputModel(fileSchema, context);

    // Use the decorated entity model for the entity.
    this.schemaRegistry.setFile(context.entity, fileSchema);
    if (hasNaturalIdentifier) {
      this.schemaRegistry.markNaturalIdentifier(context.entity);
    }

    if (fileSchema.alias) {
      this.schemaRegistry.setAlias(context.entity, fileSchema.alias);
    }

    this.processFileSchemaIdentifier(fileSchema, context);
  }

  private processFileSchemaIdentifier(fileSchema: FileSchema, context: FileProcessorContext<FileSchemaProcessorContext>): void {
    if (isSingleton(fileSchema)) {
      return;
    }

    const nameSchema = Objects.orElse(fileSchema.name, { type: "string" });
    const idName = `${toPascalCase(this.schemaRegistry.getAlias(context.entity))}Identifier`;
    this.schemaRegistry.set(idName, nameSchema);
  }

  private preProcessInputModel(model: FileSchema, context: FileProcessorContext<FileSchemaProcessorContext>) {
    this.processLinks(model, context);
  }

  /**
   * Converts all links in the entity schema into named relationships.
   *
   * @param entity  The name of the entity that is currently being processed.
   * @param model   The entity-schema for the current entity.
   * @param spec    The service specification.
   */
  private processLinks(model: FileSchema, context: FileProcessorContext<FileSchemaProcessorContext>): void {
    if (!model.links) {
      return;
    }

    for (const name of Object.keys(model.links)) {
      const link: Link = Objects.orEmpty(model.links)[name];

      ensureEntityExists(context.entity, link.rel, `links.${name}.rel`, this.service, this.fileErrors);

      // Convert the link into a relationship
      this.service.relationships = Arrays.orEmpty(this.service.relationships);
      this.service.relationships.push({
        left: context.entity,
        type: link.type || RelationshipType.ASSOCIATION,
        cardinality: link.cardinality,
        name,
        summary: link.summary,
        description: link.description,
        via: link.via,
        right: link.rel,
      });
    }
  }
}

/**
 * Ensures that every relationship has a name.  If no name is given it is derived from the cardinality and right node of the relationship.
 *
 * If the relationship is a to-many relationship, then the pluralized right node name is used.
 * If the relationship is a to-one relationship, then the right node name is used.
 *
 * @param relationship The relationship to check.
 */
function defaultRelationshipName(relationship: Relationship): void {
  // Generate the default name if no name exists
  if (relationship.name) {
    return;
  }
  relationship.name = Cardinality.isToMany(relationship.cardinality) ? pluralize(relationship.right) : relationship.right;
}

/**
 * Ensures that a related entity exists in the service specification file.
 *
 * @param sourceEntity  The name of the source entity where the relationship is defined (the left-hand-side of the relationship).
 * @param linkedEntity  The name of the linked entity (the right-hand-side of the relationship)
 * @param jsonPath      The dotted JSON path to where the "rel" was defined.
 * @param spec          The service specification.
 * @param results       The file processing results.
 */
function ensureEntityExists(sourceEntity: string, linkedEntity: string, jsonPath: string, spec: ServiceSpecification, results: FileErrors) {
  // Check the service specification to ensure that the "rel" entity exists.
  if (!spec.entities.includes(linkedEntity)) {
    // If not, lookup the file location where the link was defined...
    const sourcePath = toFileSchemaPath(sourceEntity);
    const location = sourceMaps.getLocation(sourcePath, jsonPath.split("."));

    // ... and add an error indicating the unknown entity.
    results.withErrors(sourcePath, [
      {
        line: location?.line || 0,
        column: location?.column || 0,
        severity: "error",
        keyword: "unknown-entity",
        message: `entity [${linkedEntity}] is missing in specification entities`,
        path: jsonPath,
      },
    ]);
  }
}

function toFileSchemaPath(entity: string): string {
  return path.resolve(path.dirname(getServicePath()), `files/${entity}.yaml`);
}
