import { PathError } from "../../../src/common/io";

describe("PathError", () => {
  it("should remember all constructor values", () => {
    const output = new PathError("my message", "foo", "props");
    expect(output.message).toStrictEqual("my message");
    expect(output.path).toStrictEqual("foo");
    expect(output.keyword).toStrictEqual("props");
  });
});
