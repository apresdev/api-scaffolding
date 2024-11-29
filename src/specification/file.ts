import { Aliasable, Createable, Deleteable, Editable, Linkable, Multiplicity, Nameable, Ownable } from "./entity";

/**
 * A strongly typed name for a file type name. (e.g. vehicle-photo)
 */
export type FileTypeName = string;

/**
 * File defines the interface specification for files managed by the service.
 */
export interface FileSchema extends Nameable, Ownable, Createable, Editable, Deleteable, Multiplicity, Aliasable, Linkable {
  /**
   * The type, indicating that this is a file.
   */
  type: "file";

  /**
   * The collection of content types that are allowed.
   */
  accept?: ContentType | ContentTypes;

  /**
   * An optional restriction on the maximum file size.  This will help to prevent against DOS attacks that attempt to upload too much data.
   *
   * @type integer
   */
  maxLength?: number;
}

/**
 * ContentTypes enumerates the set of supportted content types.
 */
export type ContentType = ApplicationContentType | ImageContentType | TextContentType | ContentTypeMacros;
export type ContentTypes = ContentType[];

/**
 * ApplicationContentType enumerate the set of supported application content types
 */
export enum ApplicationContentType {
  ApplicationOctetStream = "application/octet-stream",
  ApplicationJSON = "application/json",
  ApplicationYAML = "application/yaml",
  ApplicationXML = "application/xml",
}

/**
 * ImageContentType enumerate the set of supported image content types
 */
export enum ImageContentType {
  ImageAPNG = "image/apng",
  ImageBMP = "image/bmp",
  ImageGIF = "image/gif",
  ImageJPEG = "image/jpeg",
  ImagePNG = "image/png",
  ImageSVG = "image/svg+xml",
  ImageTIFF = "image/tiff",
  ImageWEBP = "image/webp",
}

/**
 * TextContentType enumerate the set of supported image content types
 */
export enum TextContentType {
  TextCSS = "text/css",
  TextCSV = "text/csv",
  TextHTML = "text/html",
  TextCalendar = "text/calendar",
  TextJavaScript = "text/javascript",
  TextPlain = "text/plain",
}

export type ContentTypeMacros = "all" | "image/*";

export function contentTypes(accept: ContentType | ContentType[] | undefined): string[] {
  if (accept === undefined) {
    return [];
  }

  if (Array.isArray(accept)) {
    return accept.flatMap((ct) => contentType(ct));
  }

  return contentType(accept);
}

export function contentType(accept: ContentType): string[] {
  if (accept === "image/*") {
    return Object.values(ImageContentType);
  }

  return [accept];
}
