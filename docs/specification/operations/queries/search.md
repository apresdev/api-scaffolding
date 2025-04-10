# Search Query

A search query is used when a full-text search API is needed for a given entity. The purpose is to make all search-style APIs appear
consistent in the API.

| Keyword      | Description                                                                     | Schema                                                     |
| ------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| search       | The searchable entity.                                                          | `string` or [EntityProjection](../../entity-projection.md) |
| filterableBy | Optional - The collection of fields that may be used for server side filtering. | [EntityProjection](../../entity-projection.md)[]           |

Each `search` operation creates a `search{Entity}` operation at the path `/search/{entity}`.

Every `search` operation accepts the following input parameter:

```yaml
query:
  type: string
```

Additional filters can be included using the `filterableBy` option which includes an additional property:

```yaml
filterBy:
  type: object
  properties: ... each filterable property included here
```

## Examples

### Basic Search

The following example creates a search API for a `widgets`. This is expected to return all fields on the widget.

```yaml
- search: widget
```

### Search w/ a subset of fields

The following example creates a search API for a `widgets`. This is expected to return the `id` and `name` fields only.

```yaml
- search:
    widget:
      - id
      - name
```

### Search with additional filters

The following example creates a search API for a `widgets`. This is expected to return all fields on the widget. Additionally, the search
may filter on the related `manufacturer` identifiers or name (this assumes the widget has a relationship to the `manufacturer` entity )

```yaml
- search:
    widget:
      - id
      - name
  filterableBy:
    - manufacturer: ["id", "name"]
```
