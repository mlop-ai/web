import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import {
  prefetchLocalQuery,
  useLocalQuery,
  useSuspenseLocalQuery,
} from "@/lib/hooks/use-local-query";
import { LocalCache } from "@/lib/db/local-cache";
import type { inferOutput } from "@trpc/tanstack-react-query";

type ListRunData = inferOutput<typeof trpc.runs.list>;

const listRunsCache = new LocalCache<ListRunData>(
  "listRuns",
  "listRuns",
  1024 * 1024 * 1000, // 1GB
);

export const useListRuns = (orgId: string, projectName: string) =>
  useLocalQuery<ListRunData>({
    queryKey: trpc.runs.list.queryKey({
      organizationId: orgId,
      projectName: projectName,
      limit: 100,
    }),
    queryFn: () =>
      trpcClient.runs.list.query({
        organizationId: orgId,
        projectName: projectName,
        limit: 100,
      }),
    localCache: listRunsCache,
    staleTime: 1000 * 5,
  });

export const useSuspenseListRuns = (orgId: string, projectName: string) =>
  useSuspenseLocalQuery<ListRunData>({
    queryKey: trpc.runs.list.queryKey({
      organizationId: orgId,
      projectName: projectName,
      limit: 100,
    }),
    queryFn: () =>
      trpcClient.runs.list.query({
        organizationId: orgId,
        projectName: projectName,
        limit: 100,
      }),
    localCache: listRunsCache,
    staleTime: 1000 * 5,
  });

export const prefetchListRuns = (orgId: string, projectName: string) => {
  prefetchLocalQuery(queryClient, {
    queryKey: trpc.runs.list.queryKey({
      organizationId: orgId,
      projectName: projectName,
      limit: 100,
    }),
    queryFn: () =>
      trpcClient.runs.list.query({
        organizationId: orgId,
        projectName: projectName,
        limit: 100,
      }),
    localCache: listRunsCache,
    staleTime: 1000 * 5,
  });
};
