# API Generation

## Features

### Resource Ownership

#### Global

The entity is owned by the system.

All operations that work on a global entity do not need to be restricted implicitly.

#### Tenant

The entity is owned by the tenent.

All operations that work on a tenant entity be restricted implicitly by the current `tenantId` (i.e. include a tenantId = {tenantId} in the
`WHERE` clause)

#### User

The entity is owned by the user.

All operations that work on a user entity be restricted implicitly by the current `userId` (i.e. include a tenantId = {tenantId} AND userId
= {userId} in the `WHERE` clause)

### Entity Schema

#### Entity Keywords

| Keyword   | Description                                                           | Schema                                 | Default  |
| --------- | --------------------------------------------------------------------- | -------------------------------------- | -------- |
| alias     | Replaces the entity name in all OpenAPI terms (path, params, etc)     | `string`                               |          |
| versioned | Flags the entity as versioned (stores revision history)               | `boolean`                              | `false`  |
| readOnly  | Flags the entity as readOnly in the API                               | `boolean`                              | `false`  |
| editable  | Flags the entity as editable in the API (can be altered after create) | `boolean`                              | `true`   |
| ownership | The subject that owns the resource                                    | `enum: [ "global", "tenant", "user" ]` | `global` |
| singleton | Flags the entity as a singleton under the resource owner              | `boolean`                              | `false`  |

#### Property Keywords

| Keyword             | Description                            | Schema                           |
| ------------------- | -------------------------------------- | -------------------------------- |
| readOnly            | Flags the field as readOnly in the API | `boolean`                        |
| data-classification | Defines the data classification        | `enum: [ "public", "sensitive ]` |

### Example Driven Architecture

We want to use examples to help us mock out our APIs and to simplify API testing (we could use examples for known good inputs and outputs).

OpenAPI allows for multiple examples for parameters, requestBodies, and responses, where each example has a unique id stored as object
properties

```yaml
requestBody:
  content:
    application/json: # Media type
      schema: # Request body contents
        $ref: "#/components/schemas/User" # Reference to an object
      examples: # Child of media type
        Jessica: # Example 1
          value:
            id: 10
            name: Jessica Smith
        Ron: # Example 2
          value:
            id: 11
            name: Ron Stewart
```

The above has two examples defined for the requestBody, `Jessica` and `Ron`. We can use a convention

OpenAPI Backend is a tool we may wish to recommend for mocking purposes. It has the ability to mock out a server stub by returning a
response based on the OpenAPI examples. When mocking the response you can optionally specificy the named example. It uses the following
precedence:

1. If a named example was given, and examples is defined, and the named example exists in the examples with a value then return the named
   example
2. Otherwise, if a single example is given in the component, then use the singular example
3. Otherwise, if the component has multiple examples, use the first named example
4. Otherwise, mock the response from the JSON schema
   1. If the JSON schema has an example, then it will use the schema example .
   2. Otherwise, it will generate a value using the JSON schema and defined defaults.

### Case Conventions

#### Models

| Use case       | Case Convention |            Example |
| :------------- | :-------------: | -----------------: |
| Entity names   |   PascalCase    | RelationshipStatus |
| Property names |    camelCase    | relationshipStatus |

#### Paths

| Use case           | Case Convention |                Example |
| :----------------- | :-------------: | ---------------------: |
| Static Segment     |   kebab-case    |    relationship-status |
| Dynamic Parameters |    camelCase    | {relationshipStatusId} |

### Standard Operations

#### Queries

##### `findOne`

Used to retrieve a single resource from an optional parent collection.

**Example**

Find a specific physician and include the physician's favourite and relationship status.

```yaml
findOne:
  - physician
filterBy:
  - physician
join:
  - favorite
  - relationship-status
```

##### `findAll`

Used to list all of child resources from a parent collection.

**Example**

List all physicians in a given region and include the physician's favourite and relationship status.

```yaml
findAll:
  - territory
  - physician
filterBy:
  - territory
join:
  - favorite
  - relationship-status
```

##### `search`

Used to search for a specific type of resource.

**Example**

Search for a physician:

```yaml
search: physician
```

##### Aggregations

Used to reperent aggregation queries on known logical entities. The purpose of including this in the service specification is to ensure that
all reporting style queries follow common conventions:

- All reports have a "sane" URL path convention
- All reports have a consistent means of accepting report parameters
- All report outputs have a consistent style
  - Aggregations are always listed the same way
  - Group By parameters match the source entity's schema

** Example **

Summarize all payments made to a specific physican.

Break down the payments by payer and include:

- The total amount of all payments
- The total amount of all payments per year for the last five years
- The total amount of all payments by the nature of payments

```yaml
aggregate: payment
calculate:
  - name: total
    sum:
      field: amount
  - name: totalByYear
    date_histogram:
      interval: year
      last: 5
      calculate:
        sum:
          field: amount
  - name: totalByNature
    terms:
      field: nature
      calculate:
        sum:
          field: amount
join:
  - physician
  - payer
filterBy:
  - physician
groupBy:
  payer:
    - id
    - logo
    - name
```

#### Mutations

The system will automatically generate paths based on the entity and relationships. There are two types of paths generated for all
mutations, the container path and the item path.

| Path      | Example                        |
| --------- | ------------------------------ |
| Container | /stores/{storeId}/pets         |
| Item      | /stores/{storeId}/pets/{petId} |

##### CRUD

The CRUD operations are used whenever an entity as a one-to-many relationship with a parent entity that is a `composition` relationship

The standard conventions are:

| Operation | Path      | Return Code    |
| --------- | --------- | -------------- |
| create    | Container | 201 Created    |
| update    | Item      | 200 OK         |
| delete    | Container | 204 No Content |

###### Natural Identifiers

Schema authors should not include the "id" property for any schemas with system managed identifiers, the code generator will include these
on your behalf.

Some schemas may have "natural identifiers". That is to say, identifiers that are well known, are contextual, and are expected to be known
by the caller when entities are created. In this scenario, the schema authors may define the natural identifiers via the "id" property in
the entity schema. For example:

```yaml
type: object
properties:
  id:
    type: string
    enum: ["dog", "cat", "bunny"]
```

When the natural identifier is specified the id schema will be used as the entity Identifier schema. Moreover, the CREATE operation for the
entity will use the item path, rather than the container path, as it is expected that the caller will include the id in the create
operation. For example:

```http
POST /stores/{storeId}/pets/bunny
```

##### Upsert

The Upsert operations are used whenever an entity as a one-to-one relationship with a parent entity that is a `composition` relationship

| Operation | Path | Return Code |
| --------- | ---- | ----------- |
| upsert    | Item | 200 OK      |

# Service Specification Notes

## Queries

- We should figure out what we need in the generator, then figure out the minimal amount we need in the YAML to make it work.
- Not all entities should have a default list routes
  - Entities that are expected to be navigated to via an aggregation relationship
    - Physicians are normally found via territory/region dashboard or search
    - Favorites, Relationship statuses, etc. are normally read through joins on physician
- Not all entities may require a retrieve route
  - The territory and/or regions may only need to be accessed via lists in the end-user service (retrieve will be necessary in the admin
    service)
- How do we handle hierarchical relationhips
  - State 1.._ > City 1.._ > Hospital
  - State 1..\* > Hospital
- How do we handle Auth[N|Z]
  - For now, we assume no operations allow anonynous access...

## Relationships

- Default the relationship id to be the right entity name (pluralized if it is toMany)

## Entity Identifiers

- By default, we probably want to use UUID or Integer ids

ReadOnly properties

- Delete them from the input entity
