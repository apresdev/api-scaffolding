# Entity Projection

An entity projection provides a subset of fields from a given entity. Additionally, an entity projection can join on related entities
through either a named property or named relationship attached to an entity.

## Examples

### Simple

This is a simple example of projecting the `id`, `name`, and `weight` properties of the `widget` entity.

```yaml
widget:
  - id
  - name
  - weight
```

### Nested

The following shows how entity projections can include nested projections. In this example we are grabbing the `vehicle` entity `id`, then
following three separate relationships and/or sub-properties to access the `make`, `engine`, and `tire` details.

```yaml
vehicle:
  - id
  - make:
      - id
  - engine:
      - horsepower
      - displacement
  - tires:
      - intendedUse
      - width
      - aspect
      - diameter
      - loadIdex
      - speedRating
```
