import React from "react";
import {
  Bell,
  BellOff,
  Check,
  AlertCircle,
  Settings,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { trpc } from "@/utils/trpc";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import type { inferOutput } from "@trpc/tanstack-react-query";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";

type NotificationResponse = inferOutput<
  typeof trpc.organization.notifications.list
>;
type NotificationType = NotificationResponse["items"][number]["type"];
type Run = NotificationResponse["items"][number]["run"];

interface Notification {
  id: number;
  type: NotificationType;
  content: string;
  createdAt: Date;
  read: boolean;
  run?: Run;
}

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  switch (type) {
    case "RUN_CANCELLED":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case "RUN_FAILED":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Settings className="h-4 w-4 text-purple-500" />;
  }
};

const NotificationStatus = ({ type }: { type: NotificationType }) => {
  switch (type) {
    case "RUN_CANCELLED":
      return "Cancelled";
    case "RUN_FAILED":
      return "Failed";
    default:
      return "Standard";
  }
};

const formatTimestamp = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
};

const NotificationSkeleton = () => {
  return (
    <div className="space-y-4 p-3">
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg bg-muted/30 p-4"
          >
            <Skeleton className="h-4 w-4 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const NotificationList = ({
  notifications,
  onMarkAsRead,
  organizationSlug,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isLoading,
}: {
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  organizationSlug: string;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  isLoading?: boolean;
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (
        scrollTop + clientHeight >= scrollHeight * 0.8 &&
        hasNextPage &&
        fetchNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <ScrollArea className="h-[400px]">
        <NotificationSkeleton />
      </ScrollArea>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BellOff className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollContainerRef} className="h-[400px]">
      <div className="space-y-4 p-3">
        <DropdownMenuGroup className="space-y-3">
          {notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "group flex items-start gap-3 rounded-lg p-4 hover:bg-muted/80",
                !notification.read && "bg-muted/50",
              )}
              onSelect={(e) => e.preventDefault()}
            >
              <NotificationIcon type={notification.type} />
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  {notification.run ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            to="/o/$orgSlug/projects/$projectName/$runId"
                            params={{
                              orgSlug: organizationSlug,
                              projectName: notification.run.project.name,
                              runId: notification.run.id,
                            }}
                            className="group flex items-center gap-1 font-mono text-sm font-medium hover:text-primary"
                          >
                            <span>
                              {notification.run.project.name}/
                              {notification.run.name}
                            </span>
                            <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>View run details</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <p className="text-sm leading-none font-medium">
                      System Notification
                    </p>
                  )}
                  <div className="flex gap-1">
                    {!notification.read && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-primary hover:text-primary-foreground"
                              onClick={() => onMarkAsRead(notification.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span className="sr-only">Mark as read</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark as read</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <NotificationStatus type={notification.type} />:
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {notification.content}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatTimestamp(notification.createdAt)}
                </p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <p className="text-sm text-muted-foreground">Loading more...</p>
          </div>
        )}
        {!isFetchingNextPage && hasNextPage && (
          <div className="flex justify-center py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage?.()}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export const NotificationsDropdown = () => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const { data: auth, isLoading: isAuthLoading } = useQuery(
    trpc.auth.queryOptions(),
  );
  const organizationId = auth?.activeOrganization?.id;
  const organizationSlug = auth?.activeOrganization?.slug;

  const {
    data: unreadCount = 0,
    isLoading: isUnreadCountLoading,
    refetch: refetchUnreadCount,
  } = useQuery({
    ...trpc.organization.notifications.count.queryOptions({
      organizationId: organizationId || "",
      read: false,
    }),
    enabled: !!organizationId,
  });

  const {
    data: unreadNotificationsData,
    fetchNextPage: fetchNextUnread,
    hasNextPage: hasNextUnread,
    isFetchingNextPage: isFetchingNextUnread,
    refetch: refetchUnread,
    isLoading: isUnreadLoading,
  } = useInfiniteQuery({
    ...trpc.organization.notifications.list.infiniteQueryOptions({
      organizationId: organizationId || "",
      read: false,
      limit: 10,
    }),
    enabled: !!organizationId,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
  });

  const {
    data: readNotificationsData,
    fetchNextPage: fetchNextRead,
    hasNextPage: hasNextRead,
    isFetchingNextPage: isFetchingNextRead,
    refetch: refetchRead,
    isLoading: isReadLoading,
  } = useInfiniteQuery({
    ...trpc.organization.notifications.list.infiniteQueryOptions({
      organizationId: organizationId || "",
      read: true,
      limit: 10,
    }),
    enabled: !!organizationId,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
  });

  const unreadNotifications =
    unreadNotificationsData?.pages.flatMap((page) => page.items) ?? [];
  const readNotifications =
    readNotificationsData?.pages.flatMap((page) => page.items) ?? [];

  const markAsReadMutation = useMutation({
    ...trpc.organization.notifications.read.mutationOptions(),
    onSuccess: () => {
      toast.success("Notification marked as read");
      refetchUnread();
      refetchRead();
      refetchUnreadCount();
    },
    onError: () => {
      toast.error("Failed to mark notification as read");
    },
  });

  const handleMarkAsRead = (id: number) => {
    if (organizationId) {
      // Find the notification to move for immediate UI update
      const notificationToMove = unreadNotifications.find((n) => n.id === id);
      if (notificationToMove) {
        // Trigger the mutation
        markAsReadMutation.mutate({
          organizationId,
          notificationIds: [id],
        });
      }
    }
  };

  const handleClearAll = () => {
    if (organizationId && unreadNotifications.length > 0) {
      const notificationIds = unreadNotifications.map((n) => n.id);
      markAsReadMutation.mutate(
        {
          organizationId,
          notificationIds,
        },
        {
          onSuccess: () => {
            toast.success("All notifications cleared");
            refetchUnread();
            refetchRead();
            refetchUnreadCount();
          },
        },
      );
    }
  };

  if (!organizationId || !organizationSlug) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {isUnreadCountLoading && (
            <Skeleton className="absolute -top-1 -right-1 h-5 w-5 rounded-full" />
          )}
          {!isUnreadCountLoading && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-full sm:w-[420px]", isMobile && "mt-4 h-[80vh]")}
        style={{
          maxWidth: isMobile ? "100vw" : "420px",
          width: isMobile ? "calc(100vw - 32px)" : "420px",
        }}
      >
        <Tabs defaultValue="current" className="w-full">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <TabsList className="grid w-[180px] grid-cols-2">
              <TabsTrigger value="current" className="flex items-center gap-2">
                Current
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            {!isUnreadCountLoading && unreadCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-primary"
                      onClick={handleClearAll}
                      disabled={markAsReadMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Clear All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Mark all notifications as read
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <TabsContent
            value="current"
            className="mt-0 focus-visible:outline-none"
          >
            <NotificationList
              notifications={unreadNotifications}
              onMarkAsRead={handleMarkAsRead}
              organizationSlug={organizationSlug || ""}
              hasNextPage={hasNextUnread}
              fetchNextPage={fetchNextUnread}
              isFetchingNextPage={isFetchingNextUnread}
              isLoading={isAuthLoading || isUnreadLoading}
            />
          </TabsContent>
          <TabsContent
            value="history"
            className="mt-0 focus-visible:outline-none"
          >
            <NotificationList
              notifications={readNotifications}
              onMarkAsRead={handleMarkAsRead}
              organizationSlug={organizationSlug || ""}
              hasNextPage={hasNextRead}
              fetchNextPage={fetchNextRead}
              isFetchingNextPage={isFetchingNextRead}
              isLoading={isAuthLoading || isReadLoading}
            />
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
