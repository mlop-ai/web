import { queryClient, trpc } from "@/utils/trpc";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { RunNotFound } from "@/components/layout/run/not-found";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { prefetchGetRun, useGetRun } from "./~queries/get-run";
import { Layout } from "./~components/layout";
import GraphFlow from "./~components/model-graph";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute(
  "/o/$orgSlug/_authed/(run)/projects/$projectName/$runId/graph",
)({
  errorComponent: RunNotFound,
  beforeLoad: async ({ context, params }) => {
    const auth = context.auth;

    await prefetchGetRun(
      auth.activeOrganization.id,
      params.projectName,
      params.runId,
    );

    queryClient.prefetchQuery(
      trpc.runs.data.modelGraph.queryOptions({
        organizationId: auth.activeOrganization.id,
        runId: params.runId,
      }),
    );

    return {
      organizationId: auth.activeOrganization.id,
      projectName: params.projectName,
      runId: params.runId,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { projectName, runId, organizationId } = Route.useRouteContext();
  const [isFullScreen, setIsFullScreen] = useState(false);

  const { data: currentRun, isLoading } = useGetRun(
    organizationId,
    projectName,
    runId,
  );

  const { data: modelGraph } = useQuery(
    trpc.runs.data.modelGraph.queryOptions({
      organizationId,
      runId,
    }),
  );

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullScreen}
            className="h-10 w-10"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
        {isLoading || !modelGraph ? (
          <Skeleton className="h-full w-full" />
        ) : modelGraph ? (
          <GraphFlow
            runId={runId}
            orgId={organizationId}
            projectName={projectName}
          />
        ) : (
          <p>No model graph found</p>
        )}
      </div>
    );
  }

  return (
    <Layout
      run={currentRun}
      projectName={projectName}
      runId={runId}
      title="Summary"
      organizationId={organizationId}
    >
      <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col gap-4 overflow-hidden p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Model Graph</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullScreen}
            className="h-10 w-10"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        {isLoading || !modelGraph ? (
          <Skeleton className="h-full w-full" />
        ) : modelGraph ? (
          <div className="h-full w-full">
            <GraphFlow
              runId={runId}
              orgId={organizationId}
              projectName={projectName}
            />
          </div>
        ) : (
          <p>No model graph found</p>
        )}
      </div>
    </Layout>
  );
}
