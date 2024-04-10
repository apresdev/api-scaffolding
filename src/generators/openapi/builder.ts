import { OpenAPIV3 } from "openapi-types";
import _ = require("underscore");

import { DataVersion } from "./data_types";
import { CommitMessageHeader, IfMatchHeader } from "./headers";
import { BadRequestError, CommonErrors, NoContent, NotFoundError } from "./status_codes";
import { OpenAPISpecification, Security } from "./types";
import { entitySchemaRef, openApiPath, pathIdentifier, pathIdentifierParameter, toPathNounCase } from "./util";

import { pluralize, toPascalCase, toTitleCase } from "../../common";
import { SchemaRegistry } from "../../models";
import { EntitySchema } from "../../specification";

export class OpenAPIBuilder {
  private readonly openAPI: OpenAPISpecification;
  private readonly schemaRegistry: SchemaRegistry;

  public static newBuilder(openAPI: OpenAPISpecification, schemaRegistry: SchemaRegistry) {
    return new OpenAPIBuilder(openAPI, schemaRegistry);
  }

  private constructor(openAPI: OpenAPISpecification, schemaRegistry: SchemaRegistry) {
    this.openAPI = openAPI;
    this.schemaRegistry = schemaRegistry;
  }

  public path(path: string): OpenAPIPathBuilder {
    return new OpenAPIPathBuilder(path, this.openAPI, this.schemaRegistry);
  }
}

export class OpenAPIPathBuilder {
  private readonly path: string;
  private readonly openAPI: OpenAPISpecification;
  private readonly schemaRegistry: SchemaRegistry;

  constructor(path: string, openAPI: OpenAPISpecification, schemaRegistry: SchemaRegistry) {
    this.path = path;
    this.openAPI = openAPI;
    this.schemaRegistry = schemaRegistry;
  }

  public get(): OpenAPIOperationBuilder {
    return new OpenAPIOperationBuilder(this.path, this.openAPI, OpenAPIV3.HttpMethods.GET, this.schemaRegistry);
  }
  public post(): OpenAPIOperationBuilder {
    return new OpenAPIOperationBuilder(this.path, this.openAPI, OpenAPIV3.HttpMethods.POST, this.schemaRegistry);
  }
  public put(): OpenAPIOperationBuilder {
    return new OpenAPIOperationBuilder(this.path, this.openAPI, OpenAPIV3.HttpMethods.PUT, this.schemaRegistry);
  }
  public patch(): OpenAPIOperationBuilder {
    return new OpenAPIOperationBuilder(this.path, this.openAPI, OpenAPIV3.HttpMethods.PATCH, this.schemaRegistry);
  }
  public delete(): OpenAPIOperationBuilder {
    return new OpenAPIOperationBuilder(this.path, this.openAPI, OpenAPIV3.HttpMethods.DELETE, this.schemaRegistry);
  }
}

interface SuccessResponse {
  statusCode: number;
  description: string;
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  examples?: Array<OpenAPIV3.ExampleObject>;
}

export class OpenAPIOperationBuilder {
  /**
   * The path the operation belongs to.
   */
  private readonly path: string;
  /**
   * The OpenAPI specification.
   */
  private readonly openAPI: OpenAPISpecification;
  /**
   * The OpenAPI specification.
   */
  private readonly schemaRegistry: SchemaRegistry;
  /**
   * The HTTP method the operation uses.
   */
  private readonly method: OpenAPIV3.HttpMethods;

  /**
   * The operation id;
   */
  private operationId: string = "";
  /**
   * The summary description of the operation.
   */
  private summary?: string;
  /**
   * The long description of the operation.
   */
  private description?: string;
  /**
   * The operation's tag.
   */
  private tag?: string;
  /**
   * The operation parameters.
   */
  private parameters: Array<OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject> = [];
  /**
   * The request body for the operation (i.e. PUT / POST request bodies.)
   */
  private requestBody?: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject;

  /**
   * The set of response errors.
   */
  private errors: OpenAPIV3.ResponsesObject = {
    ...CommonErrors,
  };

  /**
   * The success response
   */
  private successResponse?: SuccessResponse;

  /**
   * Creates an instance of an OperationBuilder.
   *
   * @param path The URL path.
   * @param openAPI The OpenAPI specification.
   * @param method The HTTP method.
   */
  constructor(path: string, openAPI: OpenAPISpecification, method: OpenAPIV3.HttpMethods, schemaRegistry: SchemaRegistry) {
    this.path = path;
    this.openAPI = openAPI;
    this.method = method;
    this.schemaRegistry = schemaRegistry;
  }

  /**
   * Includes the operationId.
   *
   * @param operationId The operation identifier.
   * @returns The updated builder.
   */
  public withOperationId(operationId: string): OpenAPIOperationBuilder {
    this.operationId = operationId;
    return this;
  }

  public withSummary(summary: string): OpenAPIOperationBuilder {
    this.summary = summary;
    return this;
  }

  public withParameter(param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject): OpenAPIOperationBuilder {
    this.parameters.push(param);

    if ("in" in param) {
      if ((param as OpenAPIV3.ParameterObject).in === "path") {
        this.withNotFoundError();
      }
    }

    return this.withBadRequest();
  }

  public withParameters(params: Array<OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject>): OpenAPIOperationBuilder {
    for (const param of params) {
      this.withParameter(param);
    }
    return this;
  }

  public withRequestBody(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, description?: string): OpenAPIOperationBuilder {
    this.requestBody = {
      description: description || "On success",
      content: {
        "application/json": {
          schema: schema,
        },
      },
    };
    return this.withBadRequest();
  }

  public withResponse(response: OpenAPIV3.ResponsesObject): OpenAPIOperationBuilder {
    this.errors = {
      ...this.errors,
      ...response,
    };
    return this;
  }

  public withSuccessResponse(
    statusCode: number,
    description: string,
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    metadata?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  ): OpenAPIOperationBuilder {
    this.successResponse = {
      statusCode,
      description,
      schema: {
        type: "object",
        properties: {
          status: {
            $ref: "#/components/schemas/ApiStatus",
          },
          metadata: metadata,
          data: schema,
        },
      } as OpenAPIV3.SchemaObject,
    };
    return this;
  }

  public withNoContent(): OpenAPIOperationBuilder {
    this.errors = {
      ...this.errors,
      ...NoContent,
    };
    return this;
  }

  public withTag(tag: string): OpenAPIOperationBuilder {
    this.tag = tag;
    return this;
  }

  private buildTag(): [string] | undefined {
    if (!this.tag) {
      return undefined;
    }

    const tag = this.tag;
    this.openAPI.tags = this.openAPI.tags || [];
    if (!_.find(this.openAPI.tags, (tagObject) => tagObject.name === tag)) {
      this.openAPI.tags.push({
        name: tag,
        description: toTitleCase(tag) + " operations",
      });
    }

    return [tag];
  }

  /**
   * Builds the operation object.
   *
   * @returns The newly built operation object.
   */
  public build(): void {
    // Build the success response object, if one was specified.
    const successResponse = this.buildSuccessResponse();
    const parameters = this.buildParameters();

    const pathItemObject = openApiPath(this.path, this.openAPI);

    const existingMethod = pathItemObject[this.method];
    if (existingMethod) {
      throw new Error(
        `failed to build operation [${this.operationId}].  The operation [${
          existingMethod.operationId
        }] already exists for method [${String(this.method)}] at the path [${this.path}]`,
      );
    }

    pathItemObject[this.method] = {
      operationId: this.operationId,
      summary: this.summary,
      tags: this.buildTag(),
      parameters: parameters,
      description: this.description || this.summary || this.operationId,
      requestBody: this.requestBody,
      responses: {
        ...successResponse,
        ...this.errors,
      },
      security: [Security],
    };
  }

  public withNotFoundError(): OpenAPIOperationBuilder {
    this.errors = {
      ...this.errors,
      ...NotFoundError,
    };

    return this;
  }

  public withBadRequest(): OpenAPIOperationBuilder {
    this.errors = {
      ...this.errors,
      ...BadRequestError,
    };

    return this;
  }

  // TODO: Inject examples here...
  private buildResponseExample(): OpenAPIV3.ExampleObject | OpenAPIV3.ReferenceObject | undefined {
    return undefined;
  }

  private buildResponseExamples():
    | {
        [name: string]: OpenAPIV3.ExampleObject | OpenAPIV3.ReferenceObject;
      }
    | undefined {
    return undefined;
  }

  private buildSuccessResponse() {
    // Build the success response object, if one was specified.
    const successResponse: OpenAPIV3.ResponsesObject = {};
    if (this.successResponse) {
      const responseName = toPascalCase(this.operationId) + "Response";

      // TODO: Figure out how to handle this if we change the EntitySchema type.
      this.schemaRegistry.set(responseName, this.successResponse.schema as EntitySchema);

      this.openAPI.components = this.openAPI.components || {};
      this.openAPI.components.responses = this.openAPI.components.responses || {};
      this.openAPI.components.responses[responseName] = {
        description: this.successResponse.description,
        content: {
          "application/json": {
            schema: entitySchemaRef(responseName),
            example: this.buildResponseExample(),
            examples: this.buildResponseExamples(),
          },
        },
      };

      successResponse[this.successResponse.statusCode] = {
        $ref: `#/components/responses/${responseName}`,
      };
    }
    return successResponse;
  }

  private buildParameters(): Array<OpenAPIV3.ReferenceObject> | undefined {
    if (!this.parameters || this.parameters.length === 0) {
      return undefined;
    }

    return this.parameters.map((paramOrRef: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject) => {
      if ("$ref" in paramOrRef) {
        return paramOrRef as OpenAPIV3.ReferenceObject;
      }

      const param = paramOrRef as OpenAPIV3.ParameterObject;
      const paramName = toPascalCase(param.name) + "Parameter";

      this.openAPI.components = this.openAPI.components || {};
      this.openAPI.components.parameters = this.openAPI.components.parameters || {};
      this.openAPI.components.parameters[paramName] = param;

      return {
        $ref: `#/components/parameters/${paramName}`,
      };
    });
  }
}

export class Url {
  readonly _pathSegments: Array<string>;
  readonly _parameters: Array<OpenAPIV3.ParameterObject>;

  constructor(pathSegments: Array<string>, parameters: Array<OpenAPIV3.ParameterObject>) {
    // Store a copy of the array contents, to prevent further mutations on the base arrays.
    this._pathSegments = [...pathSegments];
    this._parameters = [...parameters];
  }

  public get path(): string {
    return "/" + this._pathSegments.join("/");
  }

  public get parameters(): Iterable<OpenAPIV3.ParameterObject> {
    return this._parameters;
  }
}

export class PathBuilder {
  private urlBuilder: UrlBuilder;
  pathSegments: Array<string>;
  parameters: Array<OpenAPIV3.ParameterObject>;

  constructor(urlBuilder: UrlBuilder, url?: Url) {
    this.urlBuilder = urlBuilder;

    if (url) {
      this.pathSegments = [...url._pathSegments];
      this.parameters = [...url._parameters];
    } else {
      this.pathSegments = [];
      this.parameters = [];
    }
  }

  public withNoun(noun: string, isCollection: boolean): PathBuilder {
    this.pathSegments.push(toPathNounCase(isCollection ? pluralize(noun) : noun));
    return this;
  }

  public withIdentifier(noun: string): PathBuilder {
    this.pathSegments.push(`{${pathIdentifier(noun)}}`);
    this.parameters.push(pathIdentifierParameter(noun));
    return this;
  }

  public withVersion(): PathBuilder {
    this.pathSegments.push("{version}");
    this.parameters.push({
      in: "path",
      required: true,
      name: "version",
      schema: DataVersion,
    } as OpenAPIV3.ParameterObject);
    return this;
  }

  public end(): UrlBuilder {
    return this.urlBuilder;
  }
}

export class UrlBuilder {
  private pathBuilder: PathBuilder;

  public static newBuilder() {
    return new UrlBuilder();
  }

  public static fromUrl(url: Url) {
    return new UrlBuilder(url);
  }

  private constructor(url?: Url) {
    this.pathBuilder = new PathBuilder(this, url);
  }

  public path(): PathBuilder {
    return this.pathBuilder;
  }

  public build(): Url {
    return new Url(this.pathBuilder.pathSegments, this.pathBuilder.parameters);
  }
}

export class RequestHeadersBuilder {
  private headers: Array<OpenAPIV3.ParameterObject>;

  public static newBuilder(): RequestHeadersBuilder {
    return new RequestHeadersBuilder();
  }

  private constructor() {
    this.headers = [];
  }

  public withIfMatch(): RequestHeadersBuilder {
    this.headers.push(IfMatchHeader);
    return this;
  }

  public withCommitMessage(): RequestHeadersBuilder {
    this.headers.push(CommitMessageHeader);
    return this;
  }

  public build(): Iterable<OpenAPIV3.ParameterObject> {
    return [...this.headers];
  }
}
