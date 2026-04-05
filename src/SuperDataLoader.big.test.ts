/**
 * Copyright (c) 2024,2025,2026 Andreas Lindh
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

import { createSuperDataLoader } from "./SuperDataLoader";
import instruments from "./tst_data/instruments.json";
import issuers from "./tst_data/issuers.json";
import transactionItemsArray from "./tst_data/transactionItemsArray.json";
import withTestMetrics from "./utils/testMetrics";

const INSTRUMENTS_BY_ID: Record<
  string,
  { readonly _id: string; readonly issuerId: string }
> = instruments;
const ISSUER_BY_ID: Record<string, { readonly _id: string }> = issuers;
const TRANSACTION_ITEMS = transactionItemsArray as unknown as ReadonlyArray<{
  readonly _id: string;
  readonly instrumentId: string;
}>;

function instrumentById() {
  return async (keys: readonly string[]) => {
    const result = keys.map((id) => INSTRUMENTS_BY_ID[id] || null);
    return result;
  };
}

function issuerById() {
  return async (keys: readonly string[]) => {
    const result = keys.map((id) => ISSUER_BY_ID[id] || null);
    return result;
  };
}

function initDataLoaders() {
  const dls: Record<string, DataLoader<unknown, unknown, unknown>> = {
    instrumentById: new DataLoader(instrumentById(), {
      cacheKeyFn: (_id) => _id.toString(),
    }),
    issuerById: new DataLoader(issuerById(), {
      cacheKeyFn: (_id) => _id.toString(),
    }),
  };
  return dls;
}

function initSuperDataLoaders() {
  const instrumentLoader = createSuperDataLoader({
    batchLoadFn: instrumentById(),
    cacheKeyFn: (_id) => _id.toString(),
  });
  const issuerLoader = createSuperDataLoader({
    batchLoadFn: issuerById(),
    cacheKeyFn: (_id) => _id.toString(),
  });

  const dls = {
    instrumentById: instrumentLoader,
    issuerById: issuerLoader,
  };
  return dls;
}

describe("SuperDataLoader.big", () => {
  it(
    "trivial",
    withTestMetrics("trivial", async () => {
      const dataloaders = initDataLoaders();

      const instrument = await dataloaders.instrumentById?.load(
        "558ba89433d865236cb94bda"
      );

      expect(instrument).toStrictEqual({
        _id: "558ba89433d865236cb94bda",
        issuerId: "5c4700e90a40e1000171e371",
      });

      const issuer = await dataloaders.issuerById?.load(
        "561a62f35548753344e7252f"
      );

      expect(issuer).toStrictEqual({
        _id: "561a62f35548753344e7252f",
      });
    }),
    20000
  );

  it(
    "loadMany, but without using graphql",
    withTestMetrics("loadMany, but without using graphql", async () => {
      const dataloaders = initDataLoaders();

      const instrumentIds: readonly string[] = TRANSACTION_ITEMS.map(
        (item) => item.instrumentId
      );

      const startDataLoader = performance.now();
      const loadedInstruments = await dataloaders.instrumentById?.loadMany(
        instrumentIds
      );
      const endDataLoader = performance.now();

      expect(loadedInstruments).toHaveLength(95022);

      const superDataLoaders = initSuperDataLoaders();

      const startSuperDataLoader = performance.now();
      const loadedInstruments2 =
        await superDataLoaders.instrumentById?.loadMany(instrumentIds);
      const endSuperDataLoader = performance.now();

      const dataloaderTime = endDataLoader - startDataLoader;
      const superDataLoaderTime = endSuperDataLoader - startSuperDataLoader;

      console.log(
        `[(async)]:\n[SuperDataLoader]: ${superDataLoaderTime}\n[DataLoader]: ${dataloaderTime}\n${
          dataloaderTime / superDataLoaderTime
        }x) faster}`
      );

      expect(loadedInstruments2).toHaveLength(95022);
    }),
    20000
  );

  it("returns cached values synchronously once the batch has resolved", async () => {
    const loader = createSuperDataLoader({
      batchLoadFn: instrumentById(),
      cacheKeyFn: (_id) => _id.toString(),
    });

    const instrumentIds = TRANSACTION_ITEMS.map((item) => item.instrumentId);

    // Simulate "data already fetched earlier in this request" — e.g. a
    // loadMany triggered by a parent resolver before the list is traversed.
    await loader.loadMany(instrumentIds);

    // Every subsequent load() within the same request must return the cached
    // value synchronously, never a Promise.
    let syncCount = 0;
    let promiseCount = 0;
    for (const id of instrumentIds) {
      const result = loader.load(id);
      if (result instanceof Promise) {
        promiseCount++;
      } else {
        syncCount++;
      }
    }

    expect(
      promiseCount,
      `Expected all loads to be synchronous after the batch resolved; got ${promiseCount} Promise results vs ${syncCount} synchronous`
    ).toBeLessThanOrEqual(syncCount);
  }, 20000);
});
