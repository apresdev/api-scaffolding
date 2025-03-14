# Mutations

The mutations operations are used to expose **write** APIs for entities.

Each mutation can either be an [Entity Mutation](./entity-mutation.md) or a [File Mutation](./file-mutation.md)

## Collections

Every `entity` and `file` in the system is stored in a [Collection](../../collections.md).

### Paths

The path for the mutation operations is derived from the collection.

For the path examples below, consider the following, we have three entities `grand-parent`, `parent`, and `child`, where `grand-parent` has
a parent-child relationship with `parent`, and `parent` has a parent-child relationship with `child`. Neither `grand-parent`, `parent`, nor
`child` are `singletons`.

#### Collection Path

The collection path is derived from the ancestral entities (parent-child relationships). The collection path includes the item path of the
parent entity, followed by the plural entity name.

**Example**

```
/grand-parents/{grandParentId}/parents/{parentId}/childs
```

#### Item Path

The item path is derived from the collection path, and includes the unique identifier of the item.

**Example**

```
/grand-parents/{grandParentId}/parents/{parentId}/childs/{childId}
```
