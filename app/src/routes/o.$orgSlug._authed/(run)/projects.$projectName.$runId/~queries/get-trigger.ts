import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import { prefetchLocalQuery, useLocalQuery } from "@/lib/hooks/use-local-query";
import { LocalCache } from "@/lib/db/local-cache";
import type { inferOutput } from "@trpc/tanstack-react-query";

type GetTriggerData = inferOutput<typeof trpc.runs.trigger.get>;

const getTriggerCache = new LocalCache<GetTriggerData>(
  "getTrigger",
  "getTrigger",
  1000 * 10,
);

export const useGetTrigger = (
  orgId: string,
  projectName: string,
  runId: string,
) =>
  useLocalQuery<GetTriggerData>({
    queryKey: trpc.runs.trigger.get.queryKey({
      organizationId: orgId,
      projectName: projectName,
      runId: runId,
    }),
    queryFn: () =>
      trpcClient.runs.trigger.get.query({
        organizationId: orgId,
        projectName: projectName,
        runId: runId,
      }),
    localCache: getTriggerCache,
    staleTime: 1000 * 5,
  });

export const prefetchGetTrigger = (
  orgId: string,
  projectName: string,
  runId: string,
) =>
  prefetchLocalQuery(queryClient, {
    queryKey: trpc.runs.trigger.get.queryKey({
      organizationId: orgId,
      projectName: projectName,
      runId: runId,
    }),
    queryFn: () =>
      trpcClient.runs.trigger.get.query({
        organizationId: orgId,
        projectName: projectName,
        runId: runId,
      }),
    localCache: getTriggerCache,
    staleTime: 1000 * 5,
  });
