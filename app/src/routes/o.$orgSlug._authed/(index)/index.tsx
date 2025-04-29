import { createFileRoute } from "@tanstack/react-router";
import DashboardLayout from "@/components/layout/dashboard/layout";
import PageLayout from "@/components/layout/page-layout";
import { OrganizationPageTitle } from "@/components/layout/page-title";
import { GettingStarted } from "./~components/getting-started";
import { RecentRuns } from "./~components/recent-runs";
import { RecentRunsSkeleton } from "./~components/recent-runs-skeleton";
import { useGettingStartedVisibility } from "./~hooks/use-getting-started";
import {
  prefetchLatestRuns,
  useLatestRuns,
} from "@/components/layout/dashboard/queries";

export const Route = createFileRoute("/o/$orgSlug/_authed/(index)/")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const auth = context.auth;
    prefetchLatestRuns(auth.activeOrganization.id);
  },
});

function RouteComponent() {
  const { orgSlug } = Route.useParams();
  const { auth } = Route.useRouteContext();
  const { visibility } = useGettingStartedVisibility({ orgSlug });

  const { data: runs, isLoading } = useLatestRuns(auth.activeOrganization.id);

  return (
    <DashboardLayout>
      <PageLayout headerLeft={<OrganizationPageTitle title="Home" />}>
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <div className="flex flex-col gap-8">
            {isLoading ? (
              <RecentRunsSkeleton />
            ) : (
              runs &&
              runs.length > 0 && (
                <>
                  <RecentRuns
                    runs={visibility === "visible" ? runs.slice(0, 4) : runs}
                    orgSlug={orgSlug}
                  />
                </>
              )
            )}
            {visibility === "visible" && <GettingStarted orgSlug={orgSlug} />}
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
}
