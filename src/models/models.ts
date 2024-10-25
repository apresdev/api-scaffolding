import path from "node:path";

import { Arrays, Objects, pluralize, toCamelCase, toPascalCase } from "../common";
import { FileProcessor, FileProcessorContext } from "../common/io";
import { FileErrors, SchemaValidator, SourceMaps } from "../common/schema";
import { buildStrategies, isMutable, isSingleton, visitSchema } from "../entities";
import { entitySchemaReference } from "../generators/openapi/util";
import {
  AnySchema,
  ArraySchema,
  Cardinality,
  Definitions,
  EntitySchema,
  Link,
  ObjectSchema,
  ReferenceSchema,
  Relationship,
  RelationshipSchema,
  RelationshipType,
  ServiceSpecification,
  StringSchema,
  getServicePath,
} from "../specification";
import { deepCopy, directoryName, fileNameWithoutExtension } from "../util";

import { SchemaRegistry } from "./schema-registry";
import { EntityIdentifierReference, defineIdentifier } from "./util";

/* eslint-disable import/no-namespace */
import * as dataTypeScema from "../schemas/any.json";
import * as entitySchema from "../schemas/model.json";
/* eslint-enable import/no-namespace */

const sourceMaps = new SourceMaps();

const entityValidator = new SchemaValidator<EntitySchema>(entitySchema, sourceMaps);
const referenceValidator = new SchemaValidator<AnySchema>(dataTypeScema, sourceMaps);

const EntityIdentifier: StringSchema = {
  type: "string",
  format: "uuid",
};

export function loadEntities(service: ServiceSpecification, results: FileErrors): SchemaRegistry {
  const schemaRegistry: SchemaRegistry = new SchemaRegistry();

  schemaRegistry.set("EntityIdentifier", EntityIdentifier);
  const modelProcessor = new ModelProcessor(service, schemaRegistry, results);

  for (const entity of service.entities) {
    modelProcessor.processFile(toModelPath(entity), { entity });
  }

  // Post-process the relationships.
  for (const relationship of Objects.requireNonNull(service.relationships)) {
    defaultRelationshipName(relationship);
    embedParentId(relationship, schemaRegistry);
  }

  return schemaRegistry;
}

interface ModelProcessorContext {
  entity: string;
}

class ModelProcessor extends FileProcessor<EntitySchema, ModelProcessorContext> {
  private readonly service: ServiceSpecification;
  private readonly schemaRegistry: SchemaRegistry;

  constructor(service: ServiceSpecification, schemaRegistry: SchemaRegistry, fileErrors: FileErrors) {
    super(entityValidator, fileErrors);
    this.service = service;
    this.schemaRegistry = schemaRegistry;
  }

  protected processModel(inputModel: EntitySchema, context: FileProcessorContext<ModelProcessorContext>): void {
    // Load the base model definition.  This should include all user-defined properties
    // const inputModel = loadEntity(entity, schemaRegistry, results);

    this.preProcessModel(inputModel);
    removeDefinitions(inputModel);

    const hasNaturalIdentifier = inputModel.properties && "id" in inputModel.properties;

    // Process and set the model identifier.
    this.preProcessInputModel(inputModel, context);

    // Add all of the system defined properties on to the input model.
    let entityModel = deepCopy(inputModel);

    const strategies = buildStrategies(entityModel);
    for (const strategy of strategies) {
      entityModel = strategy(entityModel as EntitySchema, context.entity);
    }

    // If the model is expected to be mutable, create an Input model, this includes all of user defined properties, but excludes all system
    // defined properties, like id, version, created_at, etc.
    if (isMutable(inputModel)) {
      postProcessInputModel(inputModel, this.schemaRegistry);
      removeLinkProperties(inputModel);
      this.schemaRegistry.set(`${toPascalCase(context.entity)}Input`, inputModel as EntitySchema);
    }

    // Use the decorated entity model for the entity.
    removeLinkProperties(entityModel);
    this.schemaRegistry.set(context.entity, entityModel as EntitySchema);
    if (hasNaturalIdentifier) {
      this.schemaRegistry.markNaturalIdentifier(context.entity);
    }

    if (entityModel.alias) {
      this.schemaRegistry.setAlias(context.entity, entityModel.alias);
    }
  }

  private preProcessModel(model: EntitySchema) {
    this.preProcessReferences(model);
    enforcePropertyCase(model);
  }

  private preProcessReferences(model: EntitySchema) {
    visitSchema(model, (schema) => {
      if (typeof schema !== "object") {
        return;
      }

      if ("$ref" in schema) {
        schema["$ref"] = resolveReference(schema["$ref"], model, this.schemaRegistry, this.fileErrors);
      }
    });
  }

  private preProcessInputModel(model: EntitySchema, context: FileProcessorContext<ModelProcessorContext>) {
    this.processModelIdentifier(model, context);
    this.preProcessRelProperties(model, context);
    this.processLinks(model, context);
  }

  /**
   * Converts all links in the entity schema into named relationships.
   *
   * @param entity  The name of the entity that is currently being processed.
   * @param model   The entity-schema for the current entity.
   * @param spec    The service specification.
   */
  private processLinks(model: EntitySchema, context: FileProcessorContext<ModelProcessorContext>): void {
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

  private processModelIdentifier(model: EntitySchema, context: FileProcessorContext<ModelProcessorContext>) {
    let idenfierSchema;
    if (model.properties && "id" in model.properties) {
      idenfierSchema = model.properties["id"];
      delete model.properties["id"];
    } else {
      idenfierSchema = EntityIdentifierReference;
    }
    defineIdentifier(context.entity, this.schemaRegistry, idenfierSchema);
  }

  /**
   * Converts all links in the entity schema into named relationships.
   *
   * @param entity  The name of the entity that is currently being processed.
   * @param model   The entity-schema for the current entity.
   * @param spec    The service specification.
   */
  /* eslint-disable sonarjs/cognitive-complexity */
  private preProcessRelProperties(model: EntitySchema, context: FileProcessorContext<ModelProcessorContext>): void {
    visitSchema(model, (subSchema, jsonPath: string) => {
      if (!("properties" in subSchema)) {
        return;
      }

      const objectSchema = subSchema as ObjectSchema;
      for (const field of Object.keys(Objects.orEmpty(objectSchema.properties))) {
        const fieldSchema = Objects.orEmpty(objectSchema.properties)[field];

        const fieldPath = jsonPath.length > 0 ? `${jsonPath}.properties.${field}` : `properties.${field}`;

        if (isRelationshipSchema(fieldSchema)) {
          const relationshipSchema = fieldSchema as RelationshipSchema;

          ensureEntityExists(context.entity, relationshipSchema.rel, `${fieldPath}.rel`, this.service, this.fileErrors);

          // This is a "to-one" relationship
          this.service.relationships = Arrays.orEmpty(this.service.relationships);
          this.service.relationships.push({
            left: jsonPath.length > 0 ? `${jsonPath}.${context.entity}` : context.entity,
            type: relationshipSchema.type || RelationshipType.ASSOCIATION,
            cardinality: relationshipSchema.fromOne ? Cardinality.ONE_TO_ONE : Cardinality.MANY_TO_ONE,
            name: field,
            summary: relationshipSchema.summary,
            description: relationshipSchema.description,
            via: relationshipSchema.via,
            right: relationshipSchema.rel,
          });
        } else if (isArraySchema(fieldSchema)) {
          const arraySchema = fieldSchema as ArraySchema;

          if (isRelationshipSchema(arraySchema.items)) {
            // This is a "to-many" relationship
            const relationshipSchema = arraySchema.items as RelationshipSchema;

            ensureEntityExists(context.entity, relationshipSchema.rel, `${fieldPath}.items.rel`, this.service, this.fileErrors);

            this.service.relationships = Arrays.orEmpty(this.service.relationships);
            this.service.relationships.push({
              left: jsonPath.length > 0 ? `${jsonPath}.${context.entity}` : context.entity,
              type: relationshipSchema.type || RelationshipType.ASSOCIATION,
              cardinality: relationshipSchema.fromOne ? Cardinality.ONE_TO_MANY : Cardinality.MANY_TO_MANY,
              name: field,
              summary: relationshipSchema.summary,
              description: relationshipSchema.description,
              via: relationshipSchema.via,
              right: relationshipSchema.rel,
            });
          }
        }
      }
    });
  }
}
/* eslint-enable sonarjs/cognitive-complexity */

function removeLinkProperties(model: EntitySchema): void {
  delete model["linkProperties"];
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

function embedParentId(relationship: Relationship, schemaRegistry: SchemaRegistry): void {
  if (relationship.type !== RelationshipType.COMPOSITION) {
    return;
  }

  if (!Cardinality.isFromOne(relationship.cardinality)) {
    return;
  }

  const parentSchema: EntitySchema = schemaRegistry.get(relationship.left);
  if (isSingleton(parentSchema)) {
    return;
  }

  const childSchema: EntitySchema = schemaRegistry.get(relationship.right);
  childSchema.properties = Objects.orEmpty(childSchema.properties);

  // Check if this is a one-to-one relationship based on COMPOSITION.
  if (Cardinality.isToOne(relationship.cardinality)) {
    // if it is, then assign the parent identifier as the child identifier
    childSchema.properties["id"] = entitySchemaReference(`${toPascalCase(relationship.left)}Identifier`) as ReferenceSchema;
  } else {
    // Otherwise, insert the parent identifier in the schema.
    const parentId = `${toCamelCase(relationship.left)}Id`;
    childSchema.required = [...Arrays.orEmpty(childSchema.required), parentId];
    childSchema.properties[parentId] = entitySchemaReference(`${toPascalCase(relationship.left)}Identifier`) as ReferenceSchema;
  }
  schemaRegistry.set(relationship.right, childSchema);
}

function isRelationshipSchema(schema: AnySchema): boolean {
  return "rel" in schema;
}

function isArraySchema(schema: AnySchema): boolean {
  if ("type" in schema) {
    return schema.type === "array";
  }
  return false;
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
    const sourcePath = toModelPath(sourceEntity);
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

function postProcessInputModel(model: EntitySchema, schemaRegistry: SchemaRegistry) {
  removeReadOnlyFields(model, schemaRegistry);
}

function removeReadOnlyFields(model: EntitySchema, schemaRegistry: SchemaRegistry) {
  // Remove all properties that are flagged as readOnly
  visitSchema(model, (schema) => {
    if ("properties" in schema) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties = schema.properties as any;
      for (const property of Object.keys(properties)) {
        if (isReadOnly(properties[property], schemaRegistry)) {
          delete properties[property];
        }
      }
    }
  });

  // Remove all auto-generated link properties where the link is flagged as readOnly.
  if (!("linkProperties" in model)) {
    return;
  }

  const linkProperties = model.linkProperties;
  if (linkProperties) {
    for (const property of Object.keys(linkProperties)) {
      const link = linkProperties[property];
      if (link.readOnly && model.properties) {
        delete model.properties[property];
      }
    }
  }
}

function isReadOnly(schema: AnySchema, schemaRegistry: SchemaRegistry): boolean {
  if ("readOnly" in schema) {
    return schema["readOnly"] === true;
  }

  if ("$ref" in schema) {
    const parts = schema.$ref.split("/");
    return isReadOnly(schemaRegistry.get(Objects.requireNonNull(parts.at(-1))), schemaRegistry);
  }

  return false;
}

function toModelPath(entity: string): string {
  return path.resolve(path.dirname(getServicePath()), `entities/${entity}.yaml`);
}

function loadModel(entity: string, models: SchemaRegistry, results: FileErrors): EntitySchema {
  const modelPath = toModelPath(entity);
  const { model, errors } = referenceValidator.loadYaml(modelPath);
  if (errors) {
    results.withErrors(modelPath, errors);
  }

  preProcessModel(model, model, models, results);
  removeDefinitions(model);

  return model as EntitySchema;
}

function preProcessModel(schema: EntitySchema | AnySchema, model: EntitySchema | AnySchema, models: SchemaRegistry, results: FileErrors) {
  preProcessReferences(schema, model, models, results);
  enforcePropertyCase(schema);
}

export function jsonPropertyCase(property: string): string {
  return toCamelCase(property);
}

export function enforcePropertyCase(entityModel: AnySchema) {
  visitSchema(entityModel, (schema): void => {
    if ("properties" in schema) {
      const objectSchema = schema as ObjectSchema;
      const properties = objectSchema.properties;
      if (properties) {
        for (const key of Object.keys(properties)) {
          enforcePropertyCase(properties[key]);
          enforceNamingConvention(key, properties);
        }
      }
    }
  });
}

function enforceNamingConvention(property: string, object: Record<string, unknown>) {
  const newKey = jsonPropertyCase(property);
  if (newKey !== property) {
    object[newKey] = object[property];
    delete object[property];
  }
}

function removeDefinitions(schema: AnySchema) {
  if ("definitions" in schema && schema.definitions) {
    delete schema.definitions;
  }
}

function preProcessReferences(schema: AnySchema, model: AnySchema, models: SchemaRegistry, results: FileErrors) {
  visitSchema(schema, (subSchema) => {
    if (typeof subSchema !== "object") {
      return;
    }

    if ("$ref" in subSchema) {
      subSchema["$ref"] = resolveReference(subSchema["$ref"], model, models, results);
    }
  });
}

const INTERNAL_REFERENCE_PREFIX = "#/definitions/";
const OPENAPI_REFERENCE_PREFIX = "#/components/schemas/";

function resolveReference($reference: string | undefined, model: AnySchema, models: SchemaRegistry, results: FileErrors): string {
  if (!$reference) {
    throw new Error("Detected null or missing $ref value");
  }

  if ($reference.startsWith(OPENAPI_REFERENCE_PREFIX)) {
    // This has already been resolved.
    return $reference;
  }

  if ($reference.startsWith(INTERNAL_REFERENCE_PREFIX)) {
    // Extract internal reference
    return extractInternalReference($reference, model, models, results);
  }

  if ($reference.endsWith("#")) {
    // Extract external reference reference
    return extractExternalReference($reference, model, models, results);
  }

  return $reference.toUpperCase();
}

function extractInternalReference($reference: string, model: AnySchema, models: SchemaRegistry, results: FileErrors): string {
  if (!("definitions" in model)) {
    throw new Error("unresolvable internal reference.");
  }
  model["definitions"] = Objects.orEmpty(model["definitions"]);

  const referencedModelName = $reference.slice(INTERNAL_REFERENCE_PREFIX.length);
  const referencedModel = (model["definitions"] as Definitions)[referencedModelName];

  preProcessModel(referencedModel, model, models, results);

  if (!models.has(referencedModelName)) {
    models.set(referencedModelName, referencedModel as EntitySchema);
  }

  return `#/components/schemas/${toPascalCase(referencedModelName)}`;
}

function extractExternalReference($reference: string, model: AnySchema, models: SchemaRegistry, results: FileErrors): string {
  const url = $reference.slice(0, Math.max(0, $reference.length - 1));
  const referencedModelName = fileNameWithoutExtension(url);
  const dirname = directoryName(url);
  const referencedModel = loadModel(`${dirname}/${referencedModelName}`, models, results);

  preProcessModel(referencedModel, model, models, results);

  if (!models.has(referencedModelName)) {
    models.set(referencedModelName, referencedModel as EntitySchema);
  }

  return `#/components/schemas/${toPascalCase(referencedModelName)}`;
}
