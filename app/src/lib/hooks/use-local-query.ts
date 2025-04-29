import {
  QueryClient,
  useInfiniteQuery,
  useQueries,
  useQuery,
  useSuspenseQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import type { TRPCQueryKey } from "@trpc/tanstack-react-query";
import { LocalCache } from "@/lib/db/local-cache";
import { useCallback, useMemo } from "react";

interface LocalQueryOptions<T> extends UseQueryOptions<T> {
  queryKey: TRPCQueryKey;
  queryFn: () => Promise<T>;
  staleTime: number;
  localCache: LocalCache<T>;
}

const stringifyQueryKey = (queryKey: TRPCQueryKey) => {
  const stringified = JSON.stringify(queryKey)
    .replace(/,/g, "_")
    .replace(/:/g, "_")
    .replace(/'/g, "_")
    .replace(/"/g, "_")
    .replace(/{/g, "")
    .replace(/}/g, "")
    .replace(/]/g, "")
    .replace(/\\/g, "")
    .replace(/\[/g, "")
    .replace(/=/g, "_");
  return stringified;
};

export function useLocalQuery<T>({
  queryKey,
  staleTime,
  queryFn,
  localCache,
  ...rest
}: LocalQueryOptions<T>) {
  // Get cached record synchronously using Dexie's live query.
  const storageKey = stringifyQueryKey(queryKey);
  const cachedRecord = useLiveQuery(
    () => localCache.getData(storageKey),
    [storageKey],
  );
  // Use cached data as placeholder (or initialData).
  const placeholderData = cachedRecord ? cachedRecord.data : undefined;

  const cachedQueryFn = useCallback(async () => {
    // Re-read cached record (in case it was updated)
    const cached = await localCache.getData(storageKey);
    // Use cached data if it's already finished or if it has been recently synced.
    if (
      cached?.finishedAt ||
      (cached?.syncedAt &&
        new Date(cached.syncedAt) > new Date(Date.now() - staleTime))
    ) {
      return cached.data;
    }
    // Otherwise, fetch fresh data.
    const data = await queryFn();
    if (data) {
      // console.log("setting data", storageKey);
      await localCache.setData(storageKey, data);
    }
    return data;
  }, [queryFn, localCache, storageKey, staleTime]);

  return useQuery({
    queryKey: queryKey,
    queryFn: () => cachedQueryFn(),
    staleTime,
    // @ts-ignore No fucking clue on how to fix this.
    placeholderData,
    ...rest,
  });
}

export function useSuspenseLocalQuery<T>({
  queryKey,
  staleTime,
  queryFn,
  localCache,
  ...rest
}: LocalQueryOptions<T>) {
  // Get cached record synchronously using Dexie's live query.
  const storageKey = stringifyQueryKey(queryKey);
  const cachedRecord = useLiveQuery(
    () => localCache.getData(storageKey),
    [storageKey],
  );
  // Use cached data as placeholder (or initialData).
  const placeholderData = cachedRecord ? cachedRecord.data : undefined;

  const cachedQueryFn = useCallback(async () => {
    // Re-read cached record (in case it was updated)
    const cached = await localCache.getData(storageKey);
    // Use cached data if it's already finished or if it has been recently synced.
    if (
      cached?.finishedAt ||
      (cached?.syncedAt &&
        new Date(cached.syncedAt) > new Date(Date.now() - staleTime))
    ) {
      return cached.data;
    }
    // Otherwise, fetch fresh data.
    const data = await queryFn();
    if (data) {
      // console.log("setting data", storageKey);
      await localCache.setData(storageKey, data);
    }
    return data;
  }, [queryFn, localCache, storageKey, staleTime]);

  return useSuspenseQuery({
    queryKey: queryKey,
    queryFn: () => cachedQueryFn(),
    staleTime,
    // @ts-ignore No fucking clue on how to fix this.
    placeholderData,
    ...rest,
  });
}

export function useLocalQueries<T>(
  queriesOptions: Array<LocalQueryOptions<T[]>>,
): Array<UseQueryResult<T[]>> {
  // Get cached records for all queries
  const storageKeys = useMemo(
    () => queriesOptions.map((opt) => stringifyQueryKey(opt.queryKey)),
    [queriesOptions],
  );

  // Get all cached records using a single Dexie liveQuery
  const cachedRecords = useLiveQuery(async () => {
    const records = await Promise.all(
      storageKeys.map((key) =>
        queriesOptions[storageKeys.indexOf(key)].localCache.getData(key),
      ),
    );
    return records;
  }, [storageKeys.join(",")]);

  // Prepare query options with cached data and wrapped queryFn
  const combinedQueryOptions = useMemo(() => {
    return queriesOptions.map((opt, index) => {
      const storageKey = storageKeys[index];
      const cachedRecord = cachedRecords?.[index];
      const placeholderData = cachedRecord ? cachedRecord.data : undefined;

      const cachedQueryFn = async () => {
        // Re-read cached record (in case it was updated)
        const cached = await opt.localCache.getData(storageKey);

        // Use cached data if it's already finished or if it has been recently synced.
        if (
          cached?.finishedAt ||
          (cached?.syncedAt &&
            new Date(cached.syncedAt) > new Date(Date.now() - opt.staleTime))
        ) {
          return cached.data;
        }

        // Otherwise, fetch fresh data.
        const data = await opt.queryFn();
        if (data) {
          // console.log("setting data", storageKey);
          await opt.localCache.setData(storageKey, data);
        }
        return data;
      };

      return {
        ...opt,
        queryFn: cachedQueryFn,
        placeholderData,
      };
    });
  }, [queriesOptions, cachedRecords, storageKeys]);

  return useQueries({ queries: combinedQueryOptions });
}

/**
 * prefetchLocalQuery first checks for local cached data and uses it to set
 * the query cache immediately. Then it prefetches fresh data (updating both
 * localCache and query cache). This function mimics queryClient.prefetchQuery,
 * but prefills from local cache.
 */
export async function prefetchLocalQuery<T>(
  queryClient: QueryClient,
  options: LocalQueryOptions<T>,
  onlyUseCache = false,
) {
  const storageKey = stringifyQueryKey(options.queryKey);

  const cachedQueryFn = async () => {
    // Re-read the local cache in case it has been updated meanwhile.
    const cached = await options.localCache.getData(storageKey);
    // If the cache is either marked finished or has been synced recently, return it.
    if (onlyUseCache) {
      return cached?.data;
    }
    if (
      cached?.finishedAt ||
      (cached?.syncedAt &&
        new Date(cached.syncedAt) > new Date(Date.now() - options.staleTime))
    ) {
      return cached.data;
    }
    // Otherwise, call the fresh fetch function.
    const data = await options.queryFn();
    if (data) {
      // Store the new data in the local cache.
      await options.localCache.setData(storageKey, data);
    }
    return data;
  };

  // Use prefetchQuery to fetch fresh data and update both caches.
  await queryClient.prefetchQuery({
    queryKey: options.queryKey,
    staleTime: options.staleTime,
    queryFn: () => cachedQueryFn(),
  });
}

export async function ensureLocalQuery<T>(
  queryClient: QueryClient,
  options: LocalQueryOptions<T>,
  onlyUseCache = false,
) {
  const storageKey = stringifyQueryKey(options.queryKey);
  const cachedQueryFn = async () => {
    // Re-read the local cache in case it has been updated meanwhile.
    const cached = await options.localCache.getData(storageKey);
    // If the cache is either marked finished or has been synced recently, return it.
    if (onlyUseCache) {
      return cached?.data;
    }
    if (
      cached?.finishedAt ||
      (cached?.syncedAt &&
        new Date(cached.syncedAt) > new Date(Date.now() - options.staleTime))
    ) {
      return cached.data;
    }
    // Otherwise, call the fresh fetch function.
    const data = await options.queryFn();
    if (data) {
      // Store the new data in the local cache.
      await options.localCache.setData(storageKey, data);
    }
    return data;
  };

  // Use prefetchQuery to fetch fresh data and update both caches.
  return queryClient.ensureQueryData({
    queryKey: options.queryKey,
    staleTime: options.staleTime,
    queryFn: () => cachedQueryFn(),
  });
}

/**
 * A hook that uses a local cache for infinite queries.
 *
 * It reads (reactively) from local cache using Dexie's live query
 * and supplies this as the initial data (or placeholder) for the infinite query.
 * Additionally, it uses React Query's onSuccess callback to update the local cache
 * whenever new data is fetched.
 */

export interface LocalInfiniteQueryOptions<T> {
  queryKey: TRPCQueryKey;
  /**
   * The query function should accept an object with a pageParam as provided by React Query.
   */
  queryFn: ({ pageParam }: { pageParam?: unknown }) => Promise<T>;
  /**
   * How long cached records remain fresh.
   */
  staleTime: number;
  /**
   * An instance of your local cache which should support getData and setData.
   * In our case, it is backed by Dexie.
   */
  localCache: LocalCache<T>;
  /**
   * Optional function to determine the next page parameter.
   */
  getNextPageParam?: (lastPage: T, pages: T[]) => unknown;
}

export function useLocalInfiniteQuery<T>({
  queryKey,
  staleTime,
  queryFn,
  localCache,
  getNextPageParam,
}: LocalInfiniteQueryOptions<T>) {
  // Create a storage key for the entire infinite query.
  const storageKey = stringifyQueryKey(queryKey);

  // Read the cached infinite query data reactively.
  // It is assumed that localCache.getData(storageKey) returns either undefined or
  // an object that follows the structure used by React Query for infinite queries,
  // for example: { pages: T[], pageParams: unknown[] }
  const cachedRecord = useLiveQuery(
    () => localCache.getData(storageKey),
    [storageKey],
  );
  const initialData = cachedRecord ? cachedRecord.data : undefined;

  // @ts-ignore
  return useInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam,
    staleTime,
    // For infinite queries, React Query supports initialData
    // which should match the shape: { pages, pageParams }
    initialData,
    // @ts-ignore
    onSuccess: (data) => {
      // Update the local cache with the aggregated infinite query data.
      localCache.setData(storageKey, data);
    },
  });
}
