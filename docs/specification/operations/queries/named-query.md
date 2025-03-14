# Named Query

The named query is used to create a named-query that runs a complex SQL query that produces dimensions (entity properties) and measures
(aggregations).

The named-query manifests as an option to the `executeQuery` API found at the path `/queries/{queryId}`.

## Schema

### Named Query Operation

| Keyword     | Description                               | Schema                        |
| ----------- | ----------------------------------------- | ----------------------------- |
| name        | The name of the query (the `queryId`)     | `string`                      |
| description | A human readable description of the query | `string`                      |
| query       | The query object                          | [Query Object](#query-object) |

### Query Object

| Keyword      | Description                                                       | Schema                                           |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------ |
| dimensions   | Optional - The query object                                       | [Dimension](#dimension-object)[]                 |
| measures     | Optional - The query object                                       | [Measure](#measure-object)[]                     |
| filterableBy | Optional - The optional set of fields that the query can filterBy | [EntityProjection](../../entity-projection.md)[] |
| sortableBy   | Optional - The optional set of fields that the query can orderBy  | [EntityProjection](../../entity-projection.md)[] |

The query object should always have at least one of `dimensions` and/or `measures`

### Dimension Object

A [Dimension](#dimension-object) can be either one of a [ProjectionDimension](#projection-dimension-object) or
[ColumnDescriptor](#column-descriptor-object).

#### Projection Dimension Object

The [ProjectionDimension](#projection-dimension-object) is used to represent the value of a given entity in the system. It will
automatically inherit the schema of the projected fields.

This allows the author to specify the schema values once in the entity, then reference the entity schema in multiple locations. It also
allows the query designer to specify multiple fields off of a given entity in a single projection.

| Keyword    | Description                   | Schema                                         |
| ---------- | ----------------------------- | ---------------------------------------------- |
| projection | A projection of entity fields | [EntityProjection](../../entity-projection.md) |

### Measure Object

A [Measure](#measure-object) is a [ColumnDescriptor](#column-descriptor-object).

### Column Descriptor Object

A [ColumnDescriptor](#column-descriptor-object) contains all the properties of a `schema` along with a name property.

| Keyword | Description            | Schema   |
| ------- | ---------------------- | -------- |
| name    | The name of the column | `string` |

# Example

The following calculates the total number of widgets and the average widget weight, grouped by widget (id and name), with an optional filter
on the widget id:

```yaml
name: total-widgets
description: Calculates the total number of widgets, by type
query:
  filterableBy:
    - widget: ["id"]
  dimensions:
    - projection:
        widget: ["id", "name"]
  measures:
    - name: total
      type: integer
    - name: meanWeight
      type: number
```
