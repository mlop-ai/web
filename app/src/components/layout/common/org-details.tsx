import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  MoreHorizontalIcon,
  SearchIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { type Organization } from "@/lib/auth/org";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

interface OrgDetailsProps {
  organization: Organization;
}

export function OrgDetails({
  organization: activeOrganization,
}: OrgDetailsProps): React.JSX.Element {
  const sidebar = useSidebar();
  const { data } = useQuery(trpc.auth.queryOptions());
  const organizations = data?.allOrgs;

  if (!organizations || !activeOrganization) {
    return <Skeleton className="h-8 w-full" />;
  }

  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredOrganizations = organizations.filter((organization) =>
    organization.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Sidebar on mobile is sometimes not properly reset
  const handleCloseSidebar = (): void => {
    sidebar.setOpenMobile(false);
    if (typeof window !== "undefined") {
      document.body.style.removeProperty("pointer-events");
    }
  };

  const handleOpenChange = (open: boolean): void => {
    if (open) {
      setSearchTerm("");
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full px-1.5 group-data-[collapsible=icon]:!p-1.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="aspect-square size-6 rounded-md">
                <AvatarImage
                  className="rounded-md"
                  src={activeOrganization.logo ?? undefined}
                />
                <AvatarFallback className="flex size-6 items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
                  {activeOrganization.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-row items-center gap-1 overflow-hidden">
                <span className="truncate text-sm leading-tight font-semibold">
                  {activeOrganization.name}
                </span>
                <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="center"
            side="bottom"
            sideOffset={4}
          >
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full !border-none pl-8 shadow-none !outline-none"
              />
            </div>
            <DropdownMenuSeparator />
            {filteredOrganizations.length === 0 ? (
              <div className="p-2">No organization found</div>
            ) : (
              <ScrollArea className="-mr-1 pr-1 [&>[data-radix-scroll-area-viewport]]:max-h-[200px]">
                {filteredOrganizations.map((organization) => (
                  <DropdownMenuItem
                    key={organization.id}
                    asChild
                    className="cursor-pointer gap-2 p-2"
                  >
                    <Link
                      to="/o/$orgSlug"
                      preload={false}
                      key={organization.id}
                      params={{ orgSlug: organization.slug }}
                      onClick={handleCloseSidebar}
                    >
                      <Avatar className="aspect-square size-4 rounded-sm">
                        <AvatarImage
                          className="rounded-sm"
                          src={organization.logo ?? undefined}
                        />
                        <AvatarFallback className="flex size-4 items-center justify-center rounded-sm border border-neutral-200 bg-neutral-100 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
                          {organization.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {organization.name}
                      {activeOrganization.id === organization.id && (
                        <div className="ml-auto flex size-4 items-center justify-center rounded-full bg-blue-500 text-primary-foreground">
                          <CheckIcon className="size-3 shrink-0" />
                        </div>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            )}

            <DropdownMenuItem asChild className="cursor-pointer gap-2 p-2">
              <Link
                to="/o"
                className="text-muted-foreground"
                onClick={handleCloseSidebar}
              >
                <MoreHorizontalIcon className="size-4 shrink-0" />
                All organizations
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
