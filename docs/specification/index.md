# Service Specification

| Keyword    | Description                                                  | Schema                                        |
| ---------- | ------------------------------------------------------------ | --------------------------------------------- |
| apresApi   | The Apres Service specification version                      | `string`                                      |
| info       | The Apres Service specification version                      | [Information](#information-object)            |
| entities   | The collection of entities managed by the system             | [EntityName](./entity/index.md#entity-name)[] |
| files      | The collection of file types managed by the system           | [FileName](./file/index.md#file-name)[]       |
| operations | The collection of operations the service will provide (APIs) | [Operations](./operations/index.md)           |

**Example**

The following is an example of a simple service specification for an Automotive Manager application:

```yaml
apresApi: 1.0.0
info:
  title: Automan
  version: 1.0.0
  baseUrl: https://automan.app/api/
  description: The API for the AutoMan application.
  contact:
    email: developers@automan.app
entities:
  - vehicle
  - make
  - model
operations:
  mutations:
    - entity: vehicle
    - entity: make
    - entity: model
  queries:
    - findOne: vehicle
    - findAll: vehicle
```

## Information Object

| Keyword     | Description                  | Schema                     |
| ----------- | ---------------------------- | -------------------------- |
| title       | The title of the service     | `string`                   |
| version     | The Service API version      | `string`                   |
| description | A description of the service | `string`                   |
| baseUrl     |                              | `string`                   |
| contact     |                              | [Contact](#contact-object) |

## Contact Object

| Keyword | Description                                                                                      | Schema   |
| ------- | ------------------------------------------------------------------------------------------------ | -------- |
| name    | The identifying name of the contact person/organization                                          | `string` |
| url     | The URL pointing to the contact information. MUST be in the format of a URL                      | `string` |
| email   | The email address of the contact person/organization. MUST be in the format of an email address. | `string` |
