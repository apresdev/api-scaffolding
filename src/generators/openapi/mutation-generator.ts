import { OpenAPIV3 } from "openapi-types";

import { OpenAPIBuilder, RequestHeadersBuilder, Url, UrlBuilder } from "./builder";
import { ConflictError } from "./status-codes";
import { OpenAPISpecification } from "./types";
import { entitySchemaReference, toSummaryCase } from "./util";

import { aOrAn, pluralize, toPascalCase, toTitleCase } from "../../common";
import { isCreateable, isDeleteable, isEditable } from "../../entities";
import { SchemaRegistry } from "../../models";
import { DependencyGraph, EntitySchema, Mutation } from "../../specification";

/**
 * Adds the standard CRUD operations to an OpenAPI specication.  This includes two operations at the container path: list (GET) and create
 * (POST), and three operations at the item path: retrieve (GET), update (PUT), and delete (DELETE).
 *
 * @param mutation  The mutation operation.
 * @param service   The service specification, used to determine ancestry.
 * @param openAPI   The OpenAPI specification.
 */
export function renderMutations(mutation: Mutation, openAPI: OpenAPISpecification, graph: DependencyGraph, schemaRegistry: SchemaRegistry) {
  if (graph.isCollection(mutation.entity)) {
    renderCrudOperations(mutation, openAPI, graph, schemaRegistry);
  } else {
    renderUpsertOperations(mutation, openAPI, graph, schemaRegistry);
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
function renderCrudOperations(mutation: Mutation, openAPI: OpenAPISpecification, graph: DependencyGraph, schemaRegistry: SchemaRegistry) {
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
      generateCreateOp(mutation, itemUrl, openAPI, schemaRegistry, {
        ...ConflictError,
      });
    } else {
      generateCreateOp(mutation, containerUrl, openAPI, schemaRegistry);
    }
  }

  if (isEditable(schema)) {
    generateUpdateOp(mutation, itemUrl, openAPI, schemaRegistry);
  }

  if (isDeleteable(schema)) {
    generateDeleteOp(mutation, itemUrl, openAPI, schemaRegistry);
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
function renderUpsertOperations(mutation: Mutation, openAPI: OpenAPISpecification, graph: DependencyGraph, schemaRegistry: SchemaRegistry) {
  const entity = mutation.entity;
  const itemUrl = buildAncestralPath(entity, graph, schemaRegistry).path().withNoun(schemaRegistry.getAlias(entity), false).end().build();
  generateUpsertOp(mutation, itemUrl, openAPI, schemaRegistry);
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
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const entity = mutation.entity;
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .post()
    .withOperationId(`create${toPascalCase(entity)}`)
    .withSummary(`Creates ${aOrAn(entity)} ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withRequestBody(entitySchemaReference(`${entity}Input`), `The new ${toSummaryCase(entity)}`)
    .withSuccessResponse(201, `The current server side state of the newly created ${toTitleCase(entity)}.`, entitySchemaReference(entity))
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
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const entity = mutation.entity;
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .put()
    .withOperationId(`update${toPascalCase(entity)}`)
    .withSummary(`Updates ${aOrAn(entity)} ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withRequestBody(entitySchemaReference(`${entity}Input`), `The new ${toSummaryCase(entity)}`)
    .withSuccessResponse(200, `The current server side state of the updated ${toTitleCase(entity)}.`, entitySchemaReference(entity))
    .withResponse({
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
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const entity = mutation.entity;
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .delete()
    .withOperationId(`delete${toPascalCase(entity)}`)
    .withSummary(`Deletes a ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withNoContent()
    .withResponse({
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
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const entity = mutation.entity;
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .put()
    .withOperationId(`upsert${toPascalCase(entity)}`)
    .withSummary(`Upserts ${aOrAn(entity)} ${toSummaryCase(entity)}.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(entity))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withRequestBody(entitySchemaReference(`${entity}Input`), `The new ${toSummaryCase(entity)}`)
    .withSuccessResponse(
      200,
      `The current server side state of the newly created or updated ${toTitleCase(entity)}.`,
      entitySchemaReference(entity),
    )
    .withResponse({
      ...additionalErrors,
    })
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
  const urlBuilder = UrlBuilder.newBuilder();
  for (const ancestor of graph.listAncestors(entity)) {
    const alias = schemaRegistry.getAlias(ancestor.name);

    urlBuilder.path().withNoun(alias, ancestor.isCollection);
    if (ancestor.isCollection) {
      urlBuilder.path().withIdentifier(alias);
    }
  }

  return urlBuilder;
}
