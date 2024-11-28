import { ApplicationContentType, contentTypes, ImageContentType, TextContentType } from "../../src/specification/file";

describe("contentTypes", () => {
  it("should return return all supported image types when `images` is specified", () => {
    expect(contentTypes(["image/*"])).toStrictEqual([
      "image/apng",
      "image/bmp",
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/tiff",
      "image/webp",
    ]);
  });
  it("should return return all supported image types when `images` is specified", () => {
    expect(contentTypes([ApplicationContentType.ApplicationJSON, TextContentType.TextPlain, ImageContentType.ImageGIF])).toStrictEqual([
      "application/json",
      "text/plain",
      "image/gif",
    ]);
  });
});
