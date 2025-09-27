import { to } from "../../src/utils/async";

describe("to", () => {
  it("should return [null, data] when the promise resolves", async () => {
    const resolvedPromise = Promise.resolve("test data");
    const [err, data] = await to(resolvedPromise);
    expect(err).toBeNull();
    expect(data).toBe("test data");
  });

  it("should return [error, undefined] when the promise rejects", async () => {
    const error = new Error("test error");
    const rejectedPromise = Promise.reject(error);
    const [err, data] = await to(rejectedPromise);
    expect(err).toBe(error);
    expect(data).toBeUndefined();
  });
});
