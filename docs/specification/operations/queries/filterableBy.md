# `filterableBy`

## Default: IN-Clause Filter

Most fields are configured by default to use an IN-clause style filter. This allows callers to specify a collection of values, which are then used in
a SQL `IN` expression to match records.

**Example**

```yaml
filterableBy:
  - widget: ["id"]
```

This configuration will generate a request schema allowing you to filter by an array of widget IDs:

```yaml
filterBy:
  type: object
  properties:
    widget:
      type: object
      properties:
        id:
          type: array
          items:
            type: string
            format: uuid
```

Here, the caller provides an array of widget IDs (UUIDs) for filtering.

## `DateTimeFilter` for Date-Time Fields

The default IN-clause filter isn't suitable for `date-time` fields due to their potential for nanosecond-level precision. 
For this reason, the system automatically applies a specialized `DateTimeFilter` to these fields.
This filter supports both range-based and relative-style filtering.

**Example**

```yaml
filterableBy:
  - widget: ["creationTimestamp"]
```

This will produce the following request schema:

```yaml
filterBy:
  type: object
  properties:
    widget:
      type: object
      properties:
        creationTimestamp:
          $ref: "#/components/schemas/DateTimeFilter"
```

The DateTimeFilter has the following structure:

```yaml
DateTimeFilter:
  type: object
  description: >
    A filter used to filter results based on a given `date-time` field.

    Specific filters allow the client to search between a starting and ending date-time range, before a given date-time, at a specific
    date-time, and after a given date-time.

    Relative filters allow the client to search the past X chrono units (e.g. past 30 days), the next X chrono units (e.g. the next 7
    days), or within the current chrono unit (e.g. in the current month or year).
  properties:
    # Specific date-time filters.
    between:
      $ref: "#/components/schemas/DateTimeRange"
    before:
      type: string
      format: date-time
    at:
      type: string
      format: date-time
    after:
      type: string
      format: date-time
    # Relative date-time filters.
    past:
      $ref: "#/components/schemas/RelativeRange"
    next:
      $ref: "#/components/schemas/RelativeRange"
    current:
      $ref: "#/components/schemas/ChronoUnit"
  minProperties: 1
  maxProperties: 1
  additionalProperties: false
  example:
    next:
      duration: 1
      unit: week
DateTimeRange:
  type: object
  description: >
    A fixed date-time range, represented by a start date-time and an end date-time.
  required:
    - start
    - end
  properties:
    start:
      type: string
      format: date-time
    end:
      type: string
      format: date-time
```

## `!range` Decorator for Scalar Fields

The `!range` **YAML tag** is a decorator that can be applied to scalar filters.
It allows you to specify a range filter instead of the default IN-style filter. 
This is particularly useful for `integer` and `number` fields that naturally represent ranges (e.g., filtering on the model year of a vehicle)

```yaml
filterableBy:
  - vehicle: [ !range "year"]
```

This will generate a request schema that uses an `IntegerFilter` for the `year` field:

```yaml
filterBy:
  type: object
  properties:
    vehicle:
      type: object
      properties:
        year:
          $ref: "#/components/schemas/IntegerFilter"
```

The IntegerFilter has the following structure:

```yaml
IntegerFilter:
  type: object
  description: >
    A filter used to filter results based on a given `integer` field.

    Specific filters allow the client to search between a starting and ending integer range.
  properties:
    between:
      $ref: "#/components/schemas/IntegerRange"
  minProperties: 1
  maxProperties: 1
  additionalProperties: false
  example:
    between:
      start: 1
      end: 10

IntegerRange:
  type: object
  description: >
    A fixed integer range, represented by a start integer and an end integer.
  required:
    - start
    - end
  properties:
    start:
      type: integer
    end:
      type: integer
```

