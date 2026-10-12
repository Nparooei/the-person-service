describe("pagination configuration", () => {
  const original = process.env.MAX_PAGE_SIZE;
  afterEach(() => {
    if (original === undefined) delete process.env.MAX_PAGE_SIZE;
    else process.env.MAX_PAGE_SIZE = original;
    jest.resetModules();
  });

  function readConfig(value?: string) {
    if (value === undefined) delete process.env.MAX_PAGE_SIZE;
    else process.env.MAX_PAGE_SIZE = value;
    jest.resetModules();
    return require("./config").MAX_PAGE_SIZE;
  }

  it("defaults to five when unset", () => {
    expect(readConfig()).toBe(5);
  });
  it("uses the configured limit", () => {
    expect(readConfig("20")).toBe(20);
  });
  it.each(["", "0", "-1", "1.5", "abc", "Infinity", "9007199254740992"])(
    "rejects invalid configuration %s",
    (value) => {
      expect(() => readConfig(value)).toThrow();
    },
  );
});
