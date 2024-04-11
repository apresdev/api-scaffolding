# Data Types

Defines a named data type. JSON schema has four main base scalar types `string`, `number`, `integer`, and `boolean`, which define the basic
container for the scalar.

If we wish to make more restrictive data types, there are additional keywords in JSON schema that let us describe the **shape** and
**validitity** constraints for data types. For example for `string` values we can define a `format` which is both a **shape** and a
**validitity** constract. Examples of formats are `email`, `date-time`, `uri`, `ip`, etc.

We can also define a `pattern` for a string which is a regular expression for the string.

We also can define `minimum` and `maxium` constraints on numerics, string lengths, array lengths, etc.

While this is very feature-rich, it can be very time consuming to write these out each time we want to use them. For example it would be
much nicer to write the first example rather than the second example for each date-time value we want to use.

```yaml
type: date-time
```

rather than

```yaml
type: string
format: date-time
```

This becomes increasingly painful if the type has additional constraints, such as:

```yaml
type: number
minimum: 1900
maximum: 3000
multipleOf: 2
```

Arguablly we could start to create our own custom `format`s for these, but as we have shown in the previous example, have to write both the
base type and the format extension is sub-optimal. The is especially bad if someone defines the wrong base type for the format. For example,
the following would be syntactically valid but semantically incorrect:

```yaml
type: number
format: email
```

## Data Generation

By allowing named data types we can also allow for the creation of data generators that will automatically generate valid and useful data.

# Dictionary

A dictionary is a collection of name / data type pairs. The objective of the dictionary is to ensure attribute names are consistent across
entities and events when they are semantically the same.

A dictionary is particularily useful with events where there is a high cardinality of event types with a low cardinality of distint
attributes (i.e. many attributes are reused across most or all events ).

A dictionary can be useful with entities as well; however, this becomes less useful when entities all have bespoke attributes that are only
useful in a single entity.
