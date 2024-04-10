import { OpenAPIV3 } from "openapi-types";

import { OpenAPIBuilder, RequestHeadersBuilder, Url, UrlBuilder } from "./builder";
import { ConflictError, PreConditionsFailedError } from "./status_codes";
import { OpenAPISpecification } from "./types";
import { arraySchema, entitySchemaRef, toSummaryCase } from "./util";

import { aOrAn, pluralize, toPascalCase, toTitleCase } from "../../common";
import { isCreateable, isDeleteable, isEditable, isVersioned } from "../../entities";
import { SchemaRegistry } from "../../models";
import { Ancestor, DependencyGraph, EntitySchema, Mutation } from "../../specification";

/**
 * Adds the standard CRUD operations to an OpenAPI specication.  This includes two operations at the container path: list (GET) and create
 * (POST), and three operations at the item path: retrieve (GET), update (PUT), and delete (DELETE).
 *
 * @param mutation  The mutation operation.
 * @param service   The service specification, used to determine ancestry.
 * @param openAPI   The OpenAPI specification.
 */
export function renderMutations(mutation: Mutation, openAPI: OpenAPISpecification, graph: DependencyGraph, schemaRegistry: SchemaRegistry) {
  const entityModel: EntitySchema = schemaRegistry.get(mutation.entity);
  const versioned = isVersioned(entityModel);

  if (graph.isCollection(mutation.entity)) {
    renderCrudOperations(mutation, openAPI, graph, schemaRegistry, versioned);
  } else {
    renderUpsertOperations(mutation, openAPI, graph, schemaRegistry, versioned);
  }
}

/**
 * Adds the standard CRUD operations to an OpenAPI specication.  This includes two operations at the container path: list (GET) and create
 * (POST), and three operations at the item path: retrieve (GET), update (PUT), and delete (DELETE).
 *
 * @param entity The name of the entity that requires CRUD operations.
 * @param service The service specification, used to determine ancestry.
 * @param openAPI The OpenAPI specification.
 */
function renderCrudOperations(
  mutation: Mutation,
  openAPI: OpenAPISpecification,
  graph: DependencyGraph,
  schemaRegistry: SchemaRegistry,
  versioned: boolean,
) {
  const entity = mutation.entity;

  // Build the ancestral paths.
  const urlBuilder = buildAncestralPath(entity, graph, schemaRegistry).path().withNoun(schemaRegistry.getAlias(entity), true).end();

  // Build the container URL and the item URL.
  const containerUrl = urlBuilder.build();
  const itemUrl = urlBuilder.path().withIdentifier(schemaRegistry.getAlias(entity)).end().build();
  const schema: EntitySchema = schemaRegistry.get(entity);

  if (isCreateable(schema)) {
    // Special Use Case
    //
    // For models that have natural identifiers defined, we want to caller to specify the identifier, since the ids will not be system
    // managed values, but rather user supplied.
    if (schemaRegistry.hasNaturalIdentifier(entity)) {
      generateCreateOp(mutation, itemUrl, openAPI, schemaRegistry, versioned, {
        ...ConflictError,
      });
    } else {
      generateCreateOp(mutation, containerUrl, openAPI, schemaRegistry, versioned);
    }
  }

  if (isEditable(schema)) {
    generateUpdateOp(mutation, itemUrl, openAPI, schemaRegistry, versioned);
  }

  if (isDeleteable(schema)) {
    generateDeleteOp(mutation, itemUrl, openAPI, schemaRegistry, versioned);
  }

  if (versioned) {
    renderHistoryOperations(mutation, itemUrl, openAPI, schemaRegistry);
  }
}

/**
 * Adds the standard CRUD operations to an OpenAPI specication.  This includes two operations at the container path: list (GET) and create
 * (POST), and three operations at the item path: retrieve (GET), update (PUT), and delete (DELETE).
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param openAPI The OpenAPI specification.
 * @param graph   The entity-relationship dependency graph.
 */
function renderUpsertOperations(
  mutation: Mutation,
  openAPI: OpenAPISpecification,
  graph: DependencyGraph,
  schemaRegistry: SchemaRegistry,
  versioned: boolean,
) {
  const entity = mutation.entity;
  const itemUrl = buildAncestralPath(entity, graph, schemaRegistry).path().withNoun(schemaRegistry.getAlias(entity), false).end().build();
  generateUpsertOp(mutation, itemUrl, openAPI, schemaRegistry, versioned);

  if (versioned) {
    renderHistoryOperations(mutation, itemUrl, openAPI, schemaRegistry);
  }
}

function renderHistoryOperations(mutation: Mutation, itemUrl: Url, openAPI: OpenAPISpecification, schemaRegistry: SchemaRegistry) {
  const urlBuilder = UrlBuilder.fromUrl(itemUrl).path().withNoun("version", true).end();
  const versionContainerUrl = urlBuilder.build();
  const versionItemUrl = urlBuilder.path().withVersion().end().build();

  generateListVersionHistoryOp(mutation, versionContainerUrl, openAPI, schemaRegistry);
  generateRetrieveVersionOp(mutation, versionItemUrl, openAPI, schemaRegistry);
}
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CRUD Operations
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generates the standard "Create" operation
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param url     The URL descriptor for the operation.
 * @param openAPI The OpenAPI specification.
 */
function generateCreateOp(
  mutation: Mutation,
  url: Url,
  openAPI: OpenAPISpecification,
  schemaRegistry: SchemaRegistry,
  versioned: boolean,
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const entity = mutation.entity;
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  if (versioned) {
    requestHeaders.withCommitMessage();
  }

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .post()
    .withOperationId(`create${toPascalCase(entity)}`)
    .withSummary(`Creates ${aOrAn(entity)} ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withRequestBody(entitySchemaRef(entity + "Input"), `The new ${toSummaryCase(entity)}`)
    .withSuccessResponse(201, `The current server side state of the newly created ${toTitleCase(entity)}.`, entitySchemaRef(entity))
    .withResponse(additionalErrors)
    .build();
}

/**
 * Generates the standard "Update" operation
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param url     The URL descriptor for the operation.
 * @param openAPI The OpenAPI specification.

 */
function generateUpdateOp(
  mutation: Mutation,
  url: Url,
  openAPI: OpenAPISpecification,
  schemaRegistry: SchemaRegistry,
  versioned: boolean,
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const entity = mutation.entity;
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  if (versioned) {
    requestHeaders.withIfMatch().withCommitMessage();
  }

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .put()
    .withOperationId(`update${toPascalCase(entity)}`)
    .withSummary(`Updates ${aOrAn(entity)} ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withRequestBody(entitySchemaRef(entity + "Input"), `The new ${toSummaryCase(entity)}`)
    .withSuccessResponse(200, `The current server side state of the updated ${toTitleCase(entity)}.`, entitySchemaRef(entity))
    .withResponse({
      ...(versioned ? PreConditionsFailedError : {}),
      ...additionalErrors,
    })
    .build();
}

/**
 * Generates the standard "Delete" operation
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param url     The URL descriptor for the operation.
 * @param openAPI The OpenAPI specification.

 */
function generateDeleteOp(
  mutation: Mutation,
  url: Url,
  openAPI: OpenAPISpecification,
  schemaRegistry: SchemaRegistry,
  versioned: boolean,
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const entity = mutation.entity;
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  if (versioned) {
    requestHeaders.withIfMatch().withCommitMessage();
  }

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .delete()
    .withOperationId(`delete${toPascalCase(entity)}`)
    .withSummary(`Deletes a ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withNoContent()
    .withResponse({
      ...(versioned ? PreConditionsFailedError : {}),
      ...additionalErrors,
    })
    .build();
}

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Upsert Operation
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generates the standard "Upsert" operation
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param url     The URL descriptor for the operation.
 * @param openAPI The OpenAPI specification.

 */
function generateUpsertOp(
  mutation: Mutation,
  url: Url,
  openAPI: OpenAPISpecification,
  schemaRegistry: SchemaRegistry,
  versioned: boolean,
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const entity = mutation.entity;
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  if (versioned) {
    requestHeaders.withIfMatch().withCommitMessage();
  }

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .put()
    .withOperationId(`upsert${toPascalCase(entity)}`)
    .withSummary(`Upserts ${aOrAn(entity)} ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withRequestBody(entitySchemaRef(entity + "Input"), `The new ${toSummaryCase(entity)}`)
    .withSuccessResponse(
      200,
      `The current server side state of the newly created or updated ${toTitleCase(entity)}.`,
      entitySchemaRef(entity),
    )
    .withResponse({
      ...(versioned ? PreConditionsFailedError : {}),
      ...additionalErrors,
    })
    .build();
}

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Revision History Operations
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generates the standard "List" operation
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param url     The URL descriptor for the operation.
 * @param openAPI The OpenAPI specification.
 */
export function generateListVersionHistoryOp(mutation: Mutation, url: Url, openAPI: OpenAPISpecification, schemaRegistry: SchemaRegistry) {
  const entity = mutation.entity;
  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .get()
    .withOperationId(`list${toPascalCase(entity)}Versions`)
    .withSummary(`Lists all versions of ${aOrAn(entity)}  ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters])
    .withSuccessResponse(
      200,
      `All historical versions of  ${aOrAn(entity)} ${toTitleCase(entity)}.`,
      arraySchema(revisionSchema(entitySchemaRef(entity))),
    )
    .build();
}

/**
   * Generates the standard "Retrieve" operation
   *
   * @param entity  The name of the entity that requires CRUD operations.
   * @param url     The URL descriptor for the operation.
   * @param openAPI The OpenAPI specification.
  
   */
export function generateRetrieveVersionOp(mutation: Mutation, url: Url, openAPI: OpenAPISpecification, schemaRegistry: SchemaRegistry) {
  const entity = mutation.entity;
  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .get()
    .withOperationId(`retrieve${toPascalCase(entity)}Version`)
    .withSummary(`Retrieves a version of ${aOrAn(entity)} ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters])
    .withSuccessResponse(200, `A historical version of  ${aOrAn(entity)} ${toTitleCase(entity)}.`, revisionSchema(entitySchemaRef(entity)))
    .build();
}

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Utility functions
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Pre-builds a URL builder with the ancestral entities included as path segments and parameters.
 *
 * Each ancestor is added as a noun segement and an optional identifier segement (if the ancestor is a collection).  The segements are
 * added in oldest to youngest order.  For example:
 *
 *    /great-grand-parents/{greatGrandParentId}/grand-parents/{grandParentId}/parents/{parentId}
 *
 * @param entity The entity that will be mutated.
 * @param graph The dependency graph of entities.
 * @returns The URL Builder with the ancestral entities included as path segments and parameters.
 */
function buildAncestralPath(entity: string, graph: DependencyGraph, schemaRegistry: SchemaRegistry): UrlBuilder {
  return graph.listAncestors(entity).reduce((urlBuilder: UrlBuilder, ancestor: Ancestor): UrlBuilder => {
    const alias = schemaRegistry.getAlias(ancestor.name);

    urlBuilder.path().withNoun(alias, ancestor.isCollection);
    if (ancestor.isCollection) {
      urlBuilder.path().withIdentifier(alias);
    }
    return urlBuilder;
  }, UrlBuilder.newBuilder());
}

function revisionSchema(entitySchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): OpenAPIV3.SchemaObject {
  return {
    type: "object",
    properties: {
      commit: {
        type: "object",
        properties: {
          author: {
            type: "string",
          },
          message: {
            type: "string",
          },
          date: {
            type: "string",
            format: "date-time",
          },
        },
      },
      content: entitySchema,
    },
  };
}
