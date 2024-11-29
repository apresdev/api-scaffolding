import { OpenAPIV3 } from "openapi-types";
import { pluralize, toPascalCase, toTitleCase } from "../../../common";
import { DependencyGraph } from "../../../dependency-graph";
import { isCreateable, isDeleteable, isEditable } from "../../../entities";
import { SchemaRegistry } from "../../../models";
import { contentTypes, FileMutation, FileSchema } from "../../../specification";
import { OpenAPIBuilder, RequestHeadersBuilder, Url } from "../builder";
import { buildAncestralPath } from "../mutation-generator";
import { OpenAPISpecification } from "../types";
import { toSummaryCase } from "../util";

// Assumptions regarding files
//
// - Files are stored in the Object Store, like S3.
// - Files are served by a Content-Delivery Network, like CloudFront
// - Files are uploaded using specialized endpoints, like presigned S3 URLs
//   - We do not want large objects flowing through the backend as there can be restrictions on the maximum file sizes, additionally
//     this can result in large memory allocations in the back end for very little benefit.
// - Files are uploaded in a two step process:
//   - First, the caller makes an API call to request an upload endpoint
//   - Second, the call uploads the file directly to the upload endpoint
// - Files can be deleted directly via the API

/**
 * Adds the standard upload and delete operations to an OpenAPI specication for files.
 *
 * This includes two potential APIs, one to request and upload endpoint, and one to delete the file.
 *
 * @param mutation  The mutation operation.
 * @param service   The service specification, used to determine ancestry.
 * @param openAPI   The OpenAPI specification.
 */
export function renderFileMutations(
  mutation: FileMutation,
  openAPI: OpenAPISpecification,
  graph: DependencyGraph,
  schemaRegistry: SchemaRegistry,
) {
  renderFileCrudOperations(mutation, openAPI, graph, schemaRegistry);
}

/**
 * Adds the standard CRUD operations to an OpenAPI specication.  This includes two operations at the container path: list (GET) and create
 * (POST), and three operations at the item path: retrieve (GET), update (PUT), and delete (DELETE).
 *
 * @param entity The name of the entity that requires CRUD operations.
 * @param service The service specification, used to determine ancestry.
 * @param openAPI The OpenAPI specification.
 */
function renderFileCrudOperations(
  mutation: FileMutation,
  openAPI: OpenAPISpecification,
  graph: DependencyGraph,
  schemaRegistry: SchemaRegistry,
) {
  const file = mutation.file;
  const isCollection = graph.isCollection(mutation.file);

  // Build the ancestral paths.
  const urlBuilder = buildAncestralPath(file, graph, schemaRegistry).path().withNoun(schemaRegistry.getAlias(file), isCollection).end();

  // Build the container URL and the item URL.
  const containerUrl = urlBuilder.build();
  const itemUrl = urlBuilder.path().withIdentifier(schemaRegistry.getAlias(file)).end().build();
  const schema: FileSchema = schemaRegistry.getFile(file);

  if (isCollection) {
    // There should be a create and an update.
    if (isCreateable(schema)) {
      generateCreateUrlOp(mutation, containerUrl, openAPI, schemaRegistry);
    }

    if (isEditable(schema)) {
      generateUpdateUrlOp(mutation, itemUrl, openAPI, schemaRegistry);
    }

    if (isDeleteable(schema)) {
      generateDeleteFile(mutation, itemUrl, openAPI, schemaRegistry);
    }
  } else {
    // There should be a create and an update.
    if (isCreateable(schema) || isEditable(schema)) {
      generateUpsertUrlOp(mutation, containerUrl, openAPI, schemaRegistry);
    }

    if (isDeleteable(schema)) {
      generateDeleteFile(mutation, containerUrl, openAPI, schemaRegistry);
    }
  }
}

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CRUD Operations
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const UploadUrlRequest: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/schemas/UploadUrlRequest",
};

const UploadUrlResponse: OpenAPIV3.ReferenceObject = {
  $ref: "#/components/schemas/UploadUrlResponse",
};

/**
 * Generates the standard "Create" operation
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param url     The URL descriptor for the operation.
 * @param openAPI The OpenAPI specification.
 */
function generateCreateUrlOp(
  mutation: FileMutation,
  url: Url,
  openAPI: OpenAPISpecification,
  schemaRegistry: SchemaRegistry,
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const file = mutation.file;
  const fileSchema = schemaRegistry.getFile(file);
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(`/upload${url.path}`)
    .post()
    .withOperationId(`create${toPascalCase(file)}`)
    .withSummary(`Generates an upload url to create a new ${toSummaryCase(file)} file.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(file))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withRequestBody(UploadUrlRequest)
    .withSuccessResponse(200, `The current server side state of the newly created ${toTitleCase(file)}.`, UploadUrlResponse)
    .withResponse(additionalErrors)
    .withExtension("accept", contentTypes(fileSchema.accept))
    .withExtension("maxLength", fileSchema.maxLength)
    .build();
}

/**
 * Generates the standard "Create" operation
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param url     The URL descriptor for the operation.
 * @param openAPI The OpenAPI specification.
 */
function generateUpdateUrlOp(
  mutation: FileMutation,
  url: Url,
  openAPI: OpenAPISpecification,
  schemaRegistry: SchemaRegistry,
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const file = mutation.file;
  const fileSchema = schemaRegistry.getFile(file);
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(`/upload${url.path}`)
    .post()
    .withOperationId(`update${toPascalCase(file)}`)
    .withSummary(`Generates an upload url to update an existing ${toSummaryCase(file)} file.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(file))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withRequestBody(UploadUrlRequest)
    .withSuccessResponse(200, `The current server side state of the newly created ${toTitleCase(file)}.`, UploadUrlResponse)
    .withResponse(additionalErrors)
    .withExtension("accept", contentTypes(fileSchema.accept))
    .withExtension("maxLength", fileSchema.maxLength)
    .build();
}

/**
 * Generates the standard "Create" operation
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param url     The URL descriptor for the operation.
 * @param openAPI The OpenAPI specification.
 */
function generateUpsertUrlOp(
  mutation: FileMutation,
  url: Url,
  openAPI: OpenAPISpecification,
  schemaRegistry: SchemaRegistry,
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const file = mutation.file;
  const fileSchema = schemaRegistry.getFile(file);
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(`/upload${url.path}`)
    .post()
    .withOperationId(`upsert${toPascalCase(file)}`)
    .withSummary(`Generates an upload url to create or update the ${toSummaryCase(file)} file.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(file))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withRequestBody(UploadUrlRequest)
    .withSuccessResponse(200, `The current server side state of the newly created ${toTitleCase(file)}.`, UploadUrlResponse)
    .withResponse(additionalErrors)
    .withExtension("accept", contentTypes(fileSchema.accept))
    .withExtension("maxLength", fileSchema.maxLength)
    .build();
}

/**
 * Generates the standard "Delete" operation
 *
 * @param entity  The name of the entity that requires CRUD operations.
 * @param url     The URL descriptor for the operation.
 * @param openAPI The OpenAPI specification.

 */
function generateDeleteFile(
  mutation: FileMutation,
  url: Url,
  openAPI: OpenAPISpecification,
  schemaRegistry: SchemaRegistry,
  additionalErrors: OpenAPIV3.ResponsesObject = {},
) {
  const file = mutation.file;
  const requestHeaders = RequestHeadersBuilder.newBuilder();

  OpenAPIBuilder.newBuilder(openAPI, schemaRegistry)
    .path(url.path)
    .delete()
    .withOperationId(`delete${toPascalCase(file)}`)
    .withSummary(`Deletes a ${toSummaryCase(file)} file.`)
    .withTag(mutation.tag || toPascalCase(pluralize(schemaRegistry.getAlias(file))))
    .withParameters([...url.parameters, ...requestHeaders.build()])
    .withNoContent()
    .withResponse({
      ...additionalErrors,
    })
    .build();
}
