import { Arrays, Objects } from "../common";
import { entitySchemaReference } from "../generators/openapi/util";
import { EntitySchema, MutationKeywords } from "../specification";
import { entityIdentifier } from "./entities";

export type EntityStrategy = (entity: EntitySchema, name: string) => EntitySchema;

export function isMutable(model: EntitySchema): boolean {
  if ("readOnly" in model) {
    return model.readOnly !== true;
  }

  return true;
}

export function isVersioned(model: EntitySchema): boolean {
  if ("versioned" in model) {
    return model.versioned === true;
  }

  return false;
}

export function isSingleton(model: EntitySchema): boolean {
  if ("singleton" in model) {
    return model.singleton === true;
  }

  return false;
}

/**
 * Determines if a schema is createable, defaults to `true`.
 *
 * @param model The model to check.
 *
 * @returns true if and only if the createable flag is not set to false.
 */
export function isCreateable(model: EntitySchema): boolean {
  if (MutationKeywords.Createable in model) {
    return model[MutationKeywords.Createable] === true;
  }

  return true;
}

/**
 * Determines if a schema is editable, defaults to `true`.
 *
 * @param model The model to check.
 *
 * @returns true if and only if the editable flag is not set to false.
 */
export function isEditable(model: EntitySchema): boolean {
  if (MutationKeywords.Editable in model) {
    return model[MutationKeywords.Editable] === true;
  }

  return true;
}

/**
 * Determines if a schema is deleteable, defaults to `true`.
 *
 * @param model The model to check.
 *
 * @returns true if and only if the deleteable flag is not set to false.
 */
export function isDeleteable(model: EntitySchema): boolean {
  if (MutationKeywords.Deleteable in model) {
    return model[MutationKeywords.Deleteable] === true;
  }

  return true;
}

export function buildStrategies(model: EntitySchema): EntityStrategy[] {
  const strategies: EntityStrategy[] = [identifiable];

  if (isVersioned(model)) {
    strategies.push(versioned);
  }

  if (isMutable(model)) {
    if (isCreateable(model)) {
      strategies.push(createable);
    }

    if (isEditable(model)) {
      strategies.push(updateable);
    }

    if (isDeleteable(model)) {
      strategies.push(deleteable);
    }
  }

  return strategies;
}

/**
 * Ensures that the entity model has an "id"
 *
 * @returns the properties decorator that includes an "id"
 */
export function identifiable(entity: EntitySchema, name: string): EntitySchema {
  entity.required = Arrays.orEmpty(entity.required);
  if (!entity.required.includes("id")) {
    entity.required = ["id", ...entity.required];
  }

  entity.properties = Objects.orEmpty(entity.properties);
  entity.properties["id"] = entitySchemaReference(entityIdentifier(name));

  return entity;
}

/**
 * Ensures that all mutable entities include created_at timestampe.
 *
 * @returns  the properties decorator that includes the "created_at" property.
 */
function createable(entity: EntitySchema): EntitySchema {
  entity.properties = Object.assign(Objects.orEmpty(entity.properties), {
    created_at: {
      type: "string",
      format: "date-time",
    },
  });

  return entity;
}

/**
 * Ensures that all editable entities include updated_at timestampe.
 *
 * @returns  the properties decorator that includes the "updated_at" property.
 */
function updateable(entity: EntitySchema): EntitySchema {
  entity.properties = Object.assign(Objects.orEmpty(entity.properties), {
    updated_at: {
      type: "string",
      format: "date-time",
    },
  });

  return entity;
}

/**
 * Ensures that all deletable entities include deleted_at timestampe.
 *
 * @returns  the properties decorator that includes the "deleted_at" property.
 */

function deleteable(entity: EntitySchema): EntitySchema {
  entity.properties = Object.assign(Objects.orEmpty(entity.properties), {
    deleted_at: {
      type: "string",
      format: "date-time",
    },
  });

  return entity;
}

/**
 * Ensures that all versioned entities include a version number.
 *
 * @returns  the properties decorator that includes a "version"
 */
function versioned(entity: EntitySchema): EntitySchema {
  entity.properties = Object.assign(Objects.orEmpty(entity.properties), {
    version: { $ref: "#/components/schemas/DataVersion" },
  });

  return entity;
}
