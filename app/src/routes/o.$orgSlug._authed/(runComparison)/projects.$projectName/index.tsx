import { queryClient, trpc } from "@/utils/trpc";
import { createFileRoute } from "@tanstack/react-router";
import RunComparisonLayout from "@/components/layout/runComparison/layout";
import PageLayout from "@/components/layout/page-layout";
import { OrganizationPageTitle } from "@/components/layout/page-title";
import { useState, useMemo } from "react";
import { useSelectedRuns } from "./~hooks/use-selected-runs";
import { prefetchListRuns, useSuspenseListRuns } from "./~queries/list-runs";
import { groupMetrics } from "./~lib/metrics-utils";
import { MetricsDisplay } from "./~components/metrics-display";
import { RunsTableContainer } from "./~components/runs-table-container";
import { useRefresh } from "./~hooks/use-refresh";

export const Route = createFileRoute(
  "/o/$orgSlug/_authed/(runComparison)/projects/$projectName/",
)({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const auth = context.auth;

    prefetchListRuns(context.auth.activeOrganization.id, params.projectName);

    return {
      organizationId: auth.activeOrganization.id,
      projectName: params.projectName,
      organizationSlug: params.orgSlug,
    };
  },
});

/**
 * Main component for the run comparison page
 * Integrates data loading, selection state, and the display of runs and metrics
 */
function RouteComponent() {
  const { organizationId, projectName, organizationSlug } =
    Route.useRouteContext();

  const { refresh, lastRefreshed } = useRefresh({
    queries: [
      {
        predicate: (query) => {
          const firstEntry = query.queryKey[0] as string | string[];
          return firstEntry?.[0] === "runs";
        },
      },
    ],
  });

  // Suspend the entire route until the data is loaded
  const { data } = useSuspenseListRuns(organizationId, projectName);

  const {
    runColors,
    selectedRunsWithColors,
    handleRunSelection,
    handleColorChange,
    defaultRowSelection,
  } = useSelectedRuns(data.runs);

  // Process metrics data from selected runs
  const groupedMetrics = useMemo(() => {
    const metrics = groupMetrics(selectedRunsWithColors);
    return metrics;
  }, [selectedRunsWithColors]);

  return (
    <RunComparisonLayout>
      <PageLayout
        showSidebarTrigger={false}
        headerLeft={
          <OrganizationPageTitle
            breadcrumbs={[
              { title: "Home", to: "/o/$orgSlug" },
              { title: "Projects", to: "/o/$orgSlug/projects" },
            ]}
            title={projectName}
          />
        }
      >
        <div className="flex h-[calc(100vh-4rem)] w-full gap-2 p-2">
          <RunsTableContainer
            runs={data.runs}
            orgSlug={organizationSlug}
            projectName={projectName}
            onColorChange={handleColorChange}
            onSelectionChange={handleRunSelection}
            selectedRunsWithColors={selectedRunsWithColors}
            runColors={runColors}
            defaultRowSelection={defaultRowSelection}
          />
          <MetricsDisplay
            groupedMetrics={groupedMetrics}
            onRefresh={refresh}
            organizationId={organizationId}
            projectName={projectName}
            lastRefreshed={lastRefreshed}
          />
        </div>
      </PageLayout>
    </RunComparisonLayout>
  );
}
