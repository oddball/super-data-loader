interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

interface TestMetrics {
  memoryBefore: MemoryUsage;
  memoryAfter: MemoryUsage;
  memoryDelta: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  promiseCount: number;
  testName: string;
}

class PromiseTracker {
  private originalPromise: typeof Promise;
  private promiseCount = 0;

  constructor() {
    this.originalPromise = global.Promise;
  }

  startTracking(): void {
    this.promiseCount = 0;

    // Override Promise constructor to count promises
    global.Promise = class TrackedPromise<T> extends this.originalPromise<T> {
      constructor(
        executor: (
          resolve: (value: T | PromiseLike<T>) => void,
          reject: (reason?: any) => void
        ) => void
      ) {
        super(executor);
        // Access the outer class's promiseCount since it's not available on TrackedPromise
        this.constructor.prototype.promiseCount++;
      }
    } as any;

    // Also track Promise.resolve and Promise.reject
    const originalResolve = this.originalPromise.resolve;
    const originalReject = this.originalPromise.reject;
    const originalAll = this.originalPromise.all;
    const originalAllSettled = this.originalPromise.allSettled;

    global.Promise.resolve = (...args: any[]) => {
      this.promiseCount++;
      return originalResolve.apply(this.originalPromise, args);
    };

    global.Promise.reject = (...args: any[]) => {
      this.promiseCount++;
      return originalReject.apply(this.originalPromise, args);
    };

    global.Promise.all = (...args: any[]) => {
      this.promiseCount++;
      return originalAll.apply(this.originalPromise, args);
    };

    global.Promise.allSettled = (...args: any[]) => {
      this.promiseCount++;
      return originalAllSettled.apply(this.originalPromise, args);
    };
  }

  stopTracking(): number {
    // Restore original Promise
    global.Promise = this.originalPromise;
    return this.promiseCount;
  }

  getCount(): number {
    return this.promiseCount;
  }
}

function getMemoryUsage(): MemoryUsage {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100, // MB
    heapTotal: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100, // MB
    external: Math.round((usage.external / 1024 / 1024) * 100) / 100, // MB
    rss: Math.round((usage.rss / 1024 / 1024) * 100) / 100, // MB
  };
}

export function withTestMetrics<T>(
  testName: string,
  testFn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const promiseTracker = new PromiseTracker();
    const memoryBefore = getMemoryUsage();

    promiseTracker.startTracking();

    try {
      const result = await testFn();

      const promiseCount = promiseTracker.stopTracking();
      const memoryAfter = getMemoryUsage();

      const metrics: TestMetrics = {
        memoryBefore,
        memoryAfter,
        memoryDelta: {
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
          external: memoryAfter.external - memoryBefore.external,
          rss: memoryAfter.rss - memoryBefore.rss,
        },
        promiseCount,
        testName,
      };

      console.log(`\n📊 Test Metrics for "${testName}":`);
      console.log(`🧠 Memory Usage:`);
      console.log(
        `   Before: ${memoryBefore.heapUsed}MB heap, ${memoryBefore.rss}MB RSS`
      );
      console.log(
        `   After:  ${memoryAfter.heapUsed}MB heap, ${memoryAfter.rss}MB RSS`
      );
      console.log(
        `   Delta:  ${metrics.memoryDelta.heapUsed >= 0 ? "+" : ""}${
          metrics.memoryDelta.heapUsed
        }MB heap, ${metrics.memoryDelta.rss >= 0 ? "+" : ""}${
          metrics.memoryDelta.rss
        }MB RSS`
      );
      console.log(`🔗 Promises Created: ${promiseCount}`);
      console.log("");

      return result;
    } catch (error) {
      promiseTracker.stopTracking();
      throw error;
    }
  };
}

export default withTestMetrics;
