# Operations

There are two types of operations that can be defined in the service specification:

| Operation                       | Description                                       |
| ------------------------------- | ------------------------------------------------- |
| [Mutations](mutations/index.md) | Used to perform **write** operations on entities. |
| [Queries](queries/index.md)     | Used to perform **read** operations on entities.  |

## Examples

In this example we would generate the standard **CRUD** + **List** APIs that one would expect to find on a _RESTy_ resource (`create`,
`retrieve`, `update`, `delete`, `list.`)

```yaml
operations:
  mutations:
    - entity: widget
  queries:
    - findOne: widget
    - findAll: widget
```
