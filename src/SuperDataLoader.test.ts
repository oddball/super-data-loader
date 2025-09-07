/**
 * Copyright (c) 2024 Robert Herber
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { describe, it, expect, vi } from "vitest";

import createSuperDataLoader from "./SuperDataLoader";

describe("SuperDataLoader", () => {
  it("should be called multiple times", async () => {
    const batchLoadFn = vi.fn((keys) => keys);
    const loader = createSuperDataLoader({ batchLoadFn });

    const promise1 = await loader.load("key1");
    const promise2 = await loader.load("key2");
    const promise3 = await loader.load("key3");

    expect(promise1).toBe("key1");
    expect(promise2).toBe("key2");
    expect(promise3).toBe("key3");

    expect(batchLoadFn).toHaveBeenCalledTimes(3);
  });

  it("should be called one time", async () => {
    const batchLoadFn = vi.fn((keys) => keys);
    const loader = createSuperDataLoader({ batchLoadFn });

    const [promise1, promise2, promise3] = await Promise.all([
      loader.load("key1"),
      loader.load("key2"),
      loader.load("key3"),
    ]);

    expect(promise1).toBe("key1");
    expect(promise2).toBe("key2");
    expect(promise3).toBe("key3");

    expect(batchLoadFn).toHaveBeenCalledTimes(1);
  });

  it("should be called one time even", async () => {
    const batchLoadFn = vi.fn((keys) => keys);
    const loader = createSuperDataLoader({ batchLoadFn });

    await Promise.all([
      loader.load("key1"),
      loader.load("key2"),
      loader.load("key3"),
    ]);

    const [promise1, promise2, promise3] = await Promise.all([
      loader.load("key1"),
      loader.load("key2"),
      loader.load("key3"),
    ]);

    expect(promise1).toBe("key1");
    expect(promise2).toBe("key2");
    expect(promise3).toBe("key3");

    expect(batchLoadFn).toHaveBeenCalledTimes(1);
  });
});
