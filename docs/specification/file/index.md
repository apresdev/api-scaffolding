# File

A file entity represents a file that can be stored and potentially uploaded in the system (i.e. an image, a CSV file, etc.).

## File Name

All file names are strings that must be unique in the system.

> All file schemas are expected to be stored in the path `files/{fileName}.yaml`, relative to the root service specification yaml. file.

## File Schema

| Keyword   | Description                                                                                                                           | Schema                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| type      | The type, indicating that this is a file.                                                                                             | "file"                         |
| accept    | The collection of content types that are allowed.                                                                                     | [ContentType](#content-type)[] |
| maxLength | An optional restriction on the maximum file size. This will help to prevent against DOS attacks that attempt to upload too much data. | number                         |

## Content-Type

An internet [media type](https://en.wikipedia.org/wiki/Media_type), representing the type of file.

The following are the support types in the system.

### Application Files

| Content-Type             | Description     |
| ------------------------ | --------------- |
| application/octet-stream | Raw binary data |
| application/json         | JSON            |
| application/yaml         | YAML            |
| application/xml          | XML             |

### Image Files

| Content-Type  | Description                                     |
| ------------- | ----------------------------------------------- |
| image/apng    | Animated Portable Network Graphics Image Format |
| image/bmp     | Bitmap Image Format                             |
| image/gif     | Graphics Interchange Format                     |
| image/jpeg    | Joint Photographic Experts Group Image Format   |
| image/png     | Portable Network Graphics                       |
| image/svg+xml | Scalable Vector Graphics                        |
| image/tiff    | Tag Image File Format                           |
| image/webp    | WebP Image Format                               |

### Text Files

| Content-Type    | Description               |
| --------------- | ------------------------- |
| text/css        | Cascading Style Sheet     |
| text/csv        | Comma Separated Value     |
| text/html       | Hypertext Markup Language |
| text/calendar   | iCalendar format          |
| text/javascript | JavaScript file           |
| text/plain      | Plain text                |

### Content Type Macro

| Content-Type | Description                                  |
| ------------ | -------------------------------------------- |
| all          | Supports any file type                       |
| image/\*     | Supports any [image](#image-files) file type |
