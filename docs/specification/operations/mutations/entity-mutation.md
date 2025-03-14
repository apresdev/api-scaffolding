# Entity Mutation

| Keyword | Description            | Schema                                          |
| ------- | ---------------------- | ----------------------------------------------- |
| entity  | The name of the entity | [EntityName](../../entity/index.md#entity-name) |

**Example**

```yaml
mutations:
  - entity: widget
```

## Operations

The following operations are generated, depending on the entity attributes. The mutation operations are generated **if and only if** the
entity has the property `readOnly: false`.

| Operation         | Description                                             | Condition                                 |
| ----------------- | ------------------------------------------------------- | ----------------------------------------- |
| [Create](#create) | Creates a new entity in the collection                  | `createable: true` and `singleton: false` |
| [Update](#update) | Updates an existing entity in the collection            | `editable: true` and `singleton: false`   |
| [Delete](#delete) | Deletes an existing new entity in the collection        | `deleteable: true` and `singleton: false` |
| [Upsert](#upsert) | Creates or updates a singleton entity in the collection | `singleton: true`                         |

**Default Entity Settings**

| Attribute    | Default |
| ------------ | ------- |
| `singleton`  | `false` |
| `readOnly`   | `false` |
| `createable` | `true`  |
| `editable`   | `true`  |
| `deleteable` | `true`  |

### Create

Used to create a new entity in the collection.

The path for the [Create](#create) operations is either the [Collection Path](./index.md#collection-path) or the
[Item Path](./index.md#item-path), depending on whether the [Entity](../../entity/index.md) has a
[Natural Identifier](../../entity/index.md#natural-identifiers).

The [Create](#create) operation always uses an HTTP `POST` and always returns a `201 Created` HTTP status code on success.

| Path                                          | Condition                        |
| --------------------------------------------- | -------------------------------- |
| [Collection Path](./index.md#collection-path) | Does not have natural identifier |
| [Item Path](./index.md#item-path)             | Has natural identifier           |

```
POST /grand-parents/{grandParentId}/parents/{parentId}/childs

201 Created
```

### Update

Used to update an existing entity in the collection.

The path for the [Update](#update) operations is the [Item Path](./index.md#item-path).

The [Update](#update) operation always uses an HTTP `PUT` and always returns a `200 OK` HTTP status code on success.

```
PUT /grand-parents/{grandParentId}/parents/{parentId}/childs/{childId}

200 OK
```

### Delete

Used to delete an existing entity in the collection.

The path for the [Delete](#delete) operations is the [Item Path](./index.md#item-path).

The [Delete](#delete) operation always uses an HTTP `DELETE` and always returns a `204 No Content` HTTP status code on success.

```
DELETE /grand-parents/{grandParentId}/parents/{parentId}/childs/{childId}

204 No Content
```

### Upsert

Used to create or update a singleton entity in the collection.

The path for the [Upsert](#upsert) operations is the [Collection Path](./index.md#collection-path).

The [Upsert](#upsert) operation always uses an HTTP `PUT` and always returns a `200 OK` HTTP status code on success.

```
PUT /grand-parents/{grandParentId}/parents/{parentId}/child

200 OK
```
