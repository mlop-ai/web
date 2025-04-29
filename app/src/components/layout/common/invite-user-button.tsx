import { trpc } from "@/utils/trpc";
import React, { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  Mail,
  Shield,
  Users,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

type Role = "ADMIN" | "MEMBER";

interface InviteUserProps extends ComponentProps<typeof Button> {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export const InviteUser = ({
  className,
  variant,
  size = "default",
  ...buttonProps
}: InviteUserProps) => {
  const [formState, setFormState] = useState({
    email: "",
    role: "MEMBER" as Role,
    isOpen: false,
  });

  const { data: session } = useAuth();
  const orgId = session?.activeOrganization?.id;

  // Fetch current members
  const { data: members = [] } = useQuery({
    ...trpc.organization.listMembers.queryOptions({
      organizationId: orgId || "",
    }),
    enabled: !!orgId && formState.isOpen,
  });

  // Fetch pending invites
  const { data: pendingInvites = [] } = useQuery({
    ...trpc.organization.invite.listSentInvites.queryOptions({
      organizationId: orgId || "",
    }),
    enabled: !!orgId && formState.isOpen,
  });

  // Get orgSubscription from the auth context
  const maxSeats =
    session?.activeOrganization?.OrganizationSubscription?.seats || 0;

  const createInvite = useMutation({
    ...trpc.organization.invite.createInvite.mutationOptions(),
    onSuccess: () => {
      toast.success("Invitation sent successfully", {
        description: `An invitation email has been sent to ${formState.email}`,
      });
      handleDialogClose();
    },
    onError: (error) => {
      toast.error("Failed to send invitation", {
        description: error.message || "Please try again",
      });
    },
  });

  const handleDialogClose = () => {
    setFormState((prev) => ({
      ...prev,
      email: "",
      isOpen: false,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error("Organization required", {
        description: "Please select an organization first",
      });
      return;
    }

    // Check if sending this invite would exceed the seat limit
    const currentMemberCount = members.length;
    const pendingInviteCount = pendingInvites.length;

    if (currentMemberCount + pendingInviteCount >= maxSeats) {
      toast.error("Member limit reached", {
        description:
          "You've reached your organization's member limit. Please upgrade your plan to add more members.",
      });
      return;
    }

    createInvite.mutate({
      organizationId: orgId,
      email: formState.email,
      role: formState.role,
    });
  };

  if (!session || !orgId) {
    return null;
  }

  // Calculate member usage
  const currentMemberCount = members.length;
  const pendingInviteCount = pendingInvites.length;
  const totalUsed = currentMemberCount + pendingInviteCount;
  const usagePercentage = maxSeats > 0 ? (totalUsed / maxSeats) * 100 : 0;
  const isLimitReached = totalUsed >= maxSeats;

  return (
    <Dialog
      open={formState.isOpen}
      onOpenChange={(open) =>
        setFormState((prev) => ({ ...prev, isOpen: open }))
      }
    >
      <DialogTrigger asChild>
        <Button
          className={cn(
            "gap-2",
            size === "icon" ? "w-8 px-0" : "min-w-[140px]",
            className,
          )}
          variant={variant}
          size={size}
          {...buttonProps}
        >
          <UserPlus className={cn("h-4 w-4", size === "lg" && "h-5 w-5")} />
          {size !== "icon" && "Invite User"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <Alert variant="info" className="mt-4">
          This is in Beta. Permissions are not yet enforced.
        </Alert>
        <span className="text-sm text-muted-foreground">
          The invited user should sign up with the same email address they are
          invited to and they will be added to the organization.
        </span>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            <div className="flex flex-col gap-2">
              Invite a new member to join your organization.
            </div>
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {/* Member limit indicator */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Member Usage
            </Label>
            <span className="text-sm text-muted-foreground">
              {totalUsed} of {maxSeats} seats used
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />

          {isLimitReached && (
            <Alert variant="destructive" className="mt-2">
              {/* <AlertCircle className="h-4 w-4" /> */}
              <AlertTitle>Member limit reached</AlertTitle>
              <AlertDescription>
                You've reached your organization's member limit. You cannot
                invite more users until you upgrade your plan or remove existing
                members.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {!isLimitReached && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={formState.email}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full"
                  required
                  disabled={isLimitReached}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Role & Permissions
                </Label>
                <Select
                  value={formState.role}
                  onValueChange={(value: Role) =>
                    setFormState((prev) => ({ ...prev, role: value }))
                  }
                  disabled={isLimitReached}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {formState.role === "MEMBER" ? (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>
                          {formState.role === "MEMBER"
                            ? "Member"
                            : "Administrator"}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER" className="py-3">
                      <div className="flex items-start gap-2">
                        <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Member</span>
                          <span className="text-xs text-muted-foreground">
                            Can view and interact with assigned resources
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="ADMIN" className="py-3">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Administrator</span>
                          <span className="text-xs text-muted-foreground">
                            Full access to all organization settings
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDialogClose}
                disabled={createInvite.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={createInvite.isPending || isLimitReached}
              >
                <UserPlus className="h-4 w-4" />
                {createInvite.isPending
                  ? "Sending Invitation..."
                  : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
