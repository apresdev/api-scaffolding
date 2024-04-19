import path from "path";

import { pluralize, toCamelCase, toPascalCase } from "../common";
import { FileProcessor, FileProcessorContext } from "../common/io";
import { FileErrors, SchemaValidator, SourceMaps } from "../common/schema";
import { buildStrategies, isMutable, isSingleton, visitSchema } from "../entities";
import { arraySchema, entitySchemaRef } from "../generators/openapi/util";
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
  getServicePath,
} from "../specification";
import { directoryName, fileNameWithoutExtension } from "../util";

import { SchemaRegistry } from "./schema_registry";
import { EntityIdentifier, defineIdentifier } from "./util";

import * as dataTypeScema from "../schemas/any.json";
import * as entitySchema from "../schemas/model.json";

const sourceMaps = new SourceMaps();

const entityValidator = new SchemaValidator<EntitySchema>(entitySchema, sourceMaps);
const referenceValidator = new SchemaValidator<AnySchema>(dataTypeScema, sourceMaps);

export function loadEntities(service: ServiceSpecification, results: FileErrors): SchemaRegistry {
  const schemaRegistry: SchemaRegistry = new SchemaRegistry();
  const modelProcessor = new ModelProcessor(service, schemaRegistry, results);

  for (const entity of service.entities) {
    modelProcessor.processFile(toModelPath(entity), { entity });
  }

  // Post-process the relationships.
  service.relationships?.forEach((relationship: Relationship): void => {
    defaultRelationshipName(relationship);
    embedParentId(relationship, schemaRegistry);
    denormalize(relationship, schemaRegistry);
  });

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
    let entityModel = JSON.parse(JSON.stringify(inputModel));

    const strategies = buildStrategies(entityModel);
    for (const strategy of strategies) {
      entityModel = strategy(entityModel as EntitySchema, context.entity);
    }

    // If the model is expected to be mutable, create an Input model, this includes all of user defined properties, but excludes all system
    // defined properties, like id, version, created_at, etc.
    if (isMutable(inputModel)) {
      postProcessInputModel(inputModel);
      removeLinkProperties(inputModel);
      this.schemaRegistry.set(toPascalCase(context.entity) + "Input", inputModel as EntitySchema);
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

    Object.keys(model.links).forEach((name: string): void => {
      const link: Link = (model.links || {})[name];

      ensureEntityExists(context.entity, link.rel, `links.${name}.rel`, this.service, this.fileErrors);

      // Convert the link into a relationship
      this.service.relationships = this.service.relationships || [];
      this.service.relationships.push({
        left: context.entity,
        type: link.type || RelationshipType.ASSOCIATION,
        cardinality: link.cardinality,
        name: name,
        summary: link.summary,
        description: link.description,
        via: link.via,
        right: link.rel,
      });
    });
  }

  private processModelIdentifier(model: EntitySchema, context: FileProcessorContext<ModelProcessorContext>) {
    let idenfierSchema;
    if (model.properties && "id" in model.properties) {
      idenfierSchema = model.properties["id"];
      delete model.properties["id"];
    } else {
      idenfierSchema = EntityIdentifier;
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
  private preProcessRelProperties(model: EntitySchema, context: FileProcessorContext<ModelProcessorContext>): void {
    visitSchema(model, (subSchema, path: string) => {
      if (!("properties" in subSchema)) {
        return;
      }

      const objectSchema = subSchema as ObjectSchema;
      Object.keys(objectSchema.properties || {}).forEach((field: string): void => {
        const subSchema = (objectSchema.properties || {})[field];

        const fieldPath = path.length > 0 ? `${path}.properties.${field}` : "properties." + field;

        if (isRelSchema(subSchema)) {
          const rel = subSchema as RelationshipSchema;

          ensureEntityExists(context.entity, rel.rel, fieldPath + ".rel", this.service, this.fileErrors);

          // This is a "to-one" relationship
          this.service.relationships = this.service.relationships || [];
          this.service.relationships.push({
            left: path.length > 0 ? path + "." + context.entity : context.entity,
            type: rel.type || RelationshipType.ASSOCIATION,
            cardinality: rel.fromOne ? Cardinality.ONE_TO_ONE : Cardinality.MANY_TO_ONE,
            name: field,
            summary: rel.summary,
            description: rel.description,
            via: rel.via,
            right: rel.rel,
          });
        } else if (isArraySchema(subSchema)) {
          const arraySchema = subSchema as ArraySchema;

          if (isRelSchema(arraySchema.items)) {
            // This is a "to-many" relationship
            const rel = arraySchema.items as RelationshipSchema;

            ensureEntityExists(context.entity, rel.rel, fieldPath + ".items.rel", this.service, this.fileErrors);

            this.service.relationships = this.service.relationships || [];
            this.service.relationships.push({
              left: path.length > 0 ? path + "." + context.entity : context.entity,
              type: rel.type || RelationshipType.ASSOCIATION,
              cardinality: rel.fromOne ? Cardinality.ONE_TO_MANY : Cardinality.MANY_TO_MANY,
              name: field,
              summary: rel.summary,
              description: rel.description,
              via: rel.via,
              right: rel.rel,
            });
          }
        }
      });
    });
  }
}

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

  // Insert the parent identifier in the schema.
  const entitySchema: EntitySchema = schemaRegistry.get(relationship.right);
  entitySchema.properties = entitySchema.properties || {};
  entitySchema.properties[toCamelCase(relationship.left) + "Id"] = entitySchemaRef(
    toPascalCase(relationship.left) + "Identifier",
  ) as ReferenceSchema;
  schemaRegistry.set(relationship.right, entitySchema);
}

function denormalize(relationship: Relationship, schemaRegistry: SchemaRegistry): void {
  if (!relationship.denormalize) {
    return;
  }

  switch (relationship.denormalize) {
    case "byId":
      return embedById(relationship, schemaRegistry);
    case "byEntity":
      return embedByEntity(relationship, schemaRegistry);
  }
}

/**
 * Embeds a relationship by the entity identifiers.
 *
 * @param relationship   The relationship to embed.
 * @param schemaRegistry The registry of schemas.
 * @returns
 */
function embedById(relationship: Relationship, schemaRegistry: SchemaRegistry): void {
  // Update both the input and output schemas.
  [relationship.left, relationship.left + "Input"].forEach((entity) => {
    if (!schemaRegistry.has(entity)) {
      return;
    }

    const entitySchema: EntitySchema = schemaRegistry.get(entity);

    entitySchema.properties = entitySchema.properties || {};
    if (Cardinality.isToMany(relationship.cardinality)) {
      entitySchema.properties = entitySchema.properties || {};
      entitySchema.properties[toCamelCase(relationship.name)] = arraySchema(
        entitySchemaRef(toPascalCase(relationship.right) + "Identifier"),
      ) as ArraySchema;
    } else {
      entitySchema.properties[toCamelCase(relationship.name)] = entitySchemaRef(toPascalCase(relationship.right) + "Identifier");
    }

    // Update the schema in the schema registry.
    schemaRegistry.set(entity, entitySchema);
  });

  // TODO: Figure out if there's a better place to handle this in a single spot, currently we do this BEFORE we process the models and now
  // AFTER we process the relationships (if the relationship overrides the identifer).
  if (relationship.name === "id") {
    schemaRegistry.markNaturalIdentifier(relationship.left);
    processModelIdentifier(relationship.left, schemaRegistry.get(relationship.left), schemaRegistry);
  }
}

/**
 * Embeds a relationship by the entity identifiers.
 *
 * @param relationship   The relationship to embed.
 * @param schemaRegistry The registry of schemas.
 * @returns
 */
function embedByEntity(relationship: Relationship, schemaRegistry: SchemaRegistry): void {
  // Update both the input and output schemas.
  [relationship.left, relationship.left + "Input"].forEach((entity) => {
    if (!schemaRegistry.has(entity)) {
      return;
    }

    const entitySchema: EntitySchema = schemaRegistry.get(entity);

    // TODO: Determine if using the Input version is safe here.
    // I'm current using Input since it removes most of the system identifiers, given that we expect the embedded value to be fully user
    // defined and should not have it's own identifiers.
    entitySchema.properties = entitySchema.properties || {};
    if (Cardinality.isToMany(relationship.cardinality)) {
      entitySchema.properties[toCamelCase(relationship.name)] = arraySchema(
        entitySchemaRef(toPascalCase(relationship.right) + "Input"),
      ) as ArraySchema;
    } else {
      entitySchema.properties[toCamelCase(relationship.name)] = entitySchemaRef(toPascalCase(relationship.right) + "Input");
    }

    // Update the schema in the schema registry.
    schemaRegistry.set(entity, entitySchema);
  });
}

// function preProcessInputModel(
//   entity: string,
//   model: EntitySchema,
//   schemaRegistry: SchemaRegistry,
//   spec: ServiceSpecification,
//   results: FileErrors
// ) {
//   processModelIdentifier(entity, model, schemaRegistry);
//   processLinkProperties(entity, model, schemaRegistry, spec);
//   preProcessRelProperties(entity, model, spec, results);
//   processLinks(entity, model, spec, results);
// }

function isRelSchema(schema: AnySchema): boolean {
  return "rel" in schema;
}

function isArraySchema(schema: AnySchema): boolean {
  if ("type" in schema) {
    return schema.type === "array";
  }
  return false;
}

// /**
//  * Converts all links in the entity schema into named relationships.
//  *
//  * @param entity  The name of the entity that is currently being processed.
//  * @param model   The entity-schema for the current entity.
//  * @param spec    The service specification.
//  */
// function preProcessRelProperties(entity: string, model: EntitySchema, spec: ServiceSpecification, results: FileErrors): void {
//   visitSchema(model, (subSchema, path: string) => {
//     if (!("properties" in subSchema)) {
//       return;
//     }

//     const objectSchema = subSchema as ObjectSchema;
//     Object.keys(objectSchema.properties || {}).forEach((field: string): void => {
//       const subSchema = (objectSchema.properties || {})[field];

//       const fieldPath = path.length > 0 ? `${path}.properties.${field}` : "properties." + field;

//       if (isRelSchema(subSchema)) {
//         const rel = subSchema as RelationshipSchema;

//         ensureEntityExists(entity, rel.rel, fieldPath + ".rel", spec, results);

//         // This is a "to-one" relationship
//         spec.relationships = spec.relationships || [];
//         spec.relationships.push({
//           left: path.length > 0 ? path + "." + entity : entity,
//           type: rel.type || RelationshipType.ASSOCIATION,
//           cardinality: rel.fromOne ? Cardinality.ONE_TO_ONE : Cardinality.MANY_TO_ONE,
//           name: field,
//           summary: rel.summary,
//           description: rel.description,
//           via: rel.via,
//           right: rel.rel,
//         });
//       } else if (isArraySchema(subSchema)) {
//         const arraySchema = subSchema as ArraySchema;

//         if (isRelSchema(arraySchema.items)) {
//           // This is a "to-many" relationship
//           const rel = arraySchema.items as RelationshipSchema;

//           ensureEntityExists(entity, rel.rel, fieldPath + ".items.rel", spec, results);

//           spec.relationships = spec.relationships || [];
//           spec.relationships.push({
//             left: path.length > 0 ? path + "." + entity : entity,
//             type: rel.type || RelationshipType.ASSOCIATION,
//             cardinality: rel.fromOne ? Cardinality.ONE_TO_MANY : Cardinality.MANY_TO_MANY,
//             name: field,
//             summary: rel.summary,
//             description: rel.description,
//             via: rel.via,
//             right: rel.rel,
//           });
//         }
//       }
//     });
//   });
// }

/**
 * Ensures that a related entity exists in the service specification file.
 *
 * @param sourceEntity  The name of the source entity where the relationship is defined (the left-hand-side of the relationship).
 * @param linkedEntity  The name of the linked entity (the right-hand-side of the relationship)
 * @param path          The dotted JSON path to where the "rel" was defined.
 * @param spec          The service specification.
 * @param results       The file processing results.
 */
function ensureEntityExists(sourceEntity: string, linkedEntity: string, path: string, spec: ServiceSpecification, results: FileErrors) {
  // Check the service specification to ensure that the "rel" entity exists.
  if (!spec.entities.includes(linkedEntity)) {
    // If not, lookup the file location where the link was defined...
    const sourcePath = toModelPath(sourceEntity);
    const location = sourceMaps.getLocation(sourcePath, path.split("."));

    // ... and add an error indicating the unknown entity.
    results.withErrors(sourcePath, [
      {
        line: location?.line || 0,
        column: location?.column || 0,
        severity: "error",
        keyword: "unknown-entity",
        message: `entity [${linkedEntity}] is missing in specification entities`,
        path: path,
      },
    ]);
  }
}

// /**
//  * Converts all links in the entity schema into named relationships.
//  *
//  * @param entity  The name of the entity that is currently being processed.
//  * @param model   The entity-schema for the current entity.
//  * @param spec    The service specification.
//  */
// function processLinks(entity: string, model: EntitySchema, spec: ServiceSpecification, results: FileErrors): void {
//   if (!model.links) {
//     return;
//   }

//   Object.keys(model.links).forEach((name: string): void => {
//     const link: Link = (model.links || {})[name];

//     ensureEntityExists(entity, link.rel, `links.${name}.rel`, spec, results);

//     // Convert the link into a relationship
//     spec.relationships = spec.relationships || [];
//     spec.relationships.push({
//       left: entity,
//       type: link.type || RelationshipType.ASSOCIATION,
//       cardinality: link.cardinality,
//       name: name,
//       summary: link.summary,
//       description: link.description,
//       via: link.via,
//       right: link.rel,
//     });
//   });
// }

// function processLinkProperties(entity: string, model: EntitySchema, schemaRegistry: SchemaRegistry, spec: ServiceSpecification) {
//   if (!("linkProperties" in model)) {
//     return;
//   }

//   const linkProperties = model.linkProperties;
//   if (linkProperties) {
//     Object.keys(linkProperties).forEach((property: string): void => {
//       const link: LinkProperty = linkProperties[property];

//       model.properties = model.properties || {};
//       if (Cardinality.isToMany(link.cardinality)) {
//         model.properties[toCamelCase(property)] = arraySchema(entitySchemaRef(toPascalCase(link.rel) + "Identifier")) as ArraySchema;
//       } else {
//         model.properties[toCamelCase(property)] = entitySchemaRef(toPascalCase(link.rel) + "Identifier");
//       }

//       // Add this to the set of known relationships
//       // TODO: This violates the immutability of the service specification...
//       spec.relationships = spec.relationships || [];
//       spec.relationships.push({
//         left: entity,
//         name: property,
//         summary: property,
//         type: RelationshipType.ASSOCIATION,
//         cardinality: link.cardinality,
//         right: link.rel,
//       });

//       if ("id" === property) {
//         schemaRegistry.markNaturalIdentifier(entity);
//         processModelIdentifier(entity, model, schemaRegistry);
//       }
//     });
//   }
// }

function postProcessInputModel(model: EntitySchema) {
  removeReadOnlyFields(model);
}

function removeReadOnlyFields(model: EntitySchema) {
  // Remove all properties that are flagged as readOnly
  visitSchema(model, (schema) => {
    if ("properties" in schema) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties = schema.properties as any;
      Object.keys(properties).forEach((property) => {
        if (properties[property].readOnly) {
          delete properties[property];
        }
      });
    }
  });

  // Remove all auto-generated link properties where the link is flagged as readOnly.
  if (!("linkProperties" in model)) {
    return;
  }

  const linkProperties = model.linkProperties;
  if (linkProperties) {
    Object.keys(linkProperties).forEach((property: string): void => {
      const link = linkProperties[property];
      if (link.readOnly && model.properties) {
        delete model.properties[property];
      }
    });
  }
}

function processModelIdentifier(entity: string, model: EntitySchema, schemaRegistry: SchemaRegistry) {
  let idenfierSchema;
  if (model.properties && "id" in model.properties) {
    idenfierSchema = model.properties["id"];
    delete model.properties["id"];
  } else {
    idenfierSchema = EntityIdentifier;
  }
  defineIdentifier(entity, schemaRegistry, idenfierSchema);
}

function toModelPath(entity: string): string {
  return path.resolve(path.dirname(getServicePath()), `entities/${entity}.yaml`);
}

// function loadEntity(entity: string, models: SchemaRegistry, results: FileErrors): EntitySchema {
//   const modelPath = toModelPath(entity);
//   const { model, errors } = entityValidator.loadYaml(modelPath);

//   if (errors) {
//     results.withErrors(modelPath, errors);
//   }

//   preProcessModel(model, model, models, results);
//   removeDefinitions(model);

//   return model as EntitySchema;
// }

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
        Object.keys(properties).forEach((key) => {
          enforcePropertyCase(properties[key]);
          enforceNamingConvention(key, properties);
        });
      }
    }
  });
}

function enforceNamingConvention(property: string, obj: Record<string, unknown>) {
  const newKey = jsonPropertyCase(property);
  if (newKey !== property) {
    obj[newKey] = obj[property];
    delete obj[property];
  }
}

function removeDefinitions(schema: AnySchema) {
  if ("definitions" in schema && schema.definitions) {
    delete schema.definitions;
  }
}

function preProcessReferences(schema: AnySchema, model: AnySchema, models: SchemaRegistry, results: FileErrors) {
  visitSchema(schema, (schema) => {
    if (typeof schema !== "object") {
      return;
    }

    if ("$ref" in schema) {
      schema["$ref"] = resolveReference(schema["$ref"], model, models, results);
    }
  });
}

const INTERNAL_REFERENCE_PREFIX = "#/definitions/";

function resolveReference($ref: string | undefined, model: AnySchema, models: SchemaRegistry, results: FileErrors): string {
  if (!$ref) {
    throw new Error("Detected null or missing $ref value");
  }

  if ($ref.startsWith(INTERNAL_REFERENCE_PREFIX)) {
    // Extract internal reference
    return extractInternalReference($ref, model, models, results);
  }

  if ($ref.endsWith("#")) {
    // Extract external reference reference
    return extractExternalReference($ref, model, models, results);
  }

  return $ref.toUpperCase();
}

function extractInternalReference($ref: string, model: AnySchema, models: SchemaRegistry, results: FileErrors): string {
  if (!("definitions" in model)) {
    throw new Error("unresolvable internal reference.");
  }
  model["definitions"] = model["definitions"] || {};

  const referencedModelName = $ref.substring(INTERNAL_REFERENCE_PREFIX.length);
  const referencedModel = (model["definitions"] as Definitions)[referencedModelName];

  preProcessModel(referencedModel, model, models, results);

  if (!models.has(referencedModelName)) {
    models.set(referencedModelName, referencedModel as EntitySchema);
  }

  return "#/components/schemas/" + toPascalCase(referencedModelName);
}

function extractExternalReference($ref: string, model: AnySchema, models: SchemaRegistry, results: FileErrors): string {
  const url = $ref.substring(0, $ref.length - 1);
  const referencedModelName = fileNameWithoutExtension(url);
  const dirname = directoryName(url);
  const referencedModel = loadModel(dirname + "/" + referencedModelName, models, results);

  preProcessModel(referencedModel, model, models, results);

  if (!models.has(referencedModelName)) {
    models.set(referencedModelName, referencedModel as EntitySchema);
  }

  return "#/components/schemas/" + toPascalCase(referencedModelName);
}
