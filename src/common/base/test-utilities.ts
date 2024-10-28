export type Constructor<T> = new () => T;

export function describeUtilities<T>(ctor: Constructor<T>) {
  describe("constructor", () => {
    it("should throw an assertion error", () => {
      expect(() => new ctor()).toThrow("assertion error");
    });
  });
}
