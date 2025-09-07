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

import { describe, it, expect } from "vitest";

import DataLoader from "dataloader";

import createSuperDataLoader from "./SuperDataLoader";
import times from "./utils/times";
import wait from "./utils/wait";

describe("SuperDataLoader.performance", () => {
  it("Should be faster than normal dataloader with loadMany with same keys", async () => {
    const hello = times(1000000, () => `hello`);

    const batchLoadFn = (keys: readonly string[]) => keys;
    const loader = createSuperDataLoader({ batchLoadFn });

    const original = new DataLoader(async (keys: readonly string[]) =>
      Promise.resolve(batchLoadFn(keys))
    );

    await wait(50);

    const start2 = performance.now();
    await loader.loadMany(hello);
    const end2 = performance.now();
    const superDataLoaderTime = end2 - start2;

    await wait(50);

    const start = performance.now();
    await original.loadMany(hello);
    const end = performance.now();
    const dataloaderTime = end - start;

    console.log(
      `[same keys]:\n[SuperDataLoader]: ${superDataLoaderTime}\n[DataLoader]: ${dataloaderTime}\n${
        dataloaderTime / superDataLoaderTime
      }x) faster}`
    );

    expect(superDataLoaderTime).toBeLessThanOrEqual(dataloaderTime);
  }, 20000);

  it("Should be faster than normal dataloader with loadMany with same keys (async)", async () => {
    const hello = times(1000000, () => `hello`);

    const batchLoadFn = async (keys: readonly string[]) => {
      await wait(10);
      return keys;
    };
    const loader = createSuperDataLoader({
      batchLoadFn,
    });

    const original = new DataLoader(batchLoadFn);

    await wait(50);

    const start2 = performance.now();
    await loader.loadMany(hello);
    const end2 = performance.now();
    const superDataLoaderTime = end2 - start2;

    await wait(50);

    const start = performance.now();
    await original.loadMany(hello);
    const end = performance.now();
    const dataloaderTime = end - start;

    console.log(
      `[same keys (async)]:\n[SuperDataLoader]: ${superDataLoaderTime}\n[DataLoader]: ${dataloaderTime}\n${
        dataloaderTime / superDataLoaderTime
      }x) faster}`
    );

    expect(superDataLoaderTime).toBeLessThanOrEqual(dataloaderTime);
  }, 20000);
});
