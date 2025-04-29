import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type ColumnDef } from "@tanstack/react-table";
import { Copy, Eye, EyeOff, MoreHorizontal, Trash2, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import type { inferOutput } from "@trpc/tanstack-react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Invite = inferOutput<typeof trpc.organization.invite.listSentInvites>[0];

const formatDate = (date: Date | null) => {
  if (!date) return "Never";
  const locale = navigator.language;
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("API key copied to clipboard");
  } catch (err) {
    toast.error("Failed to copy API key");
  }
};

// function DeleteApiKeyDialog({
//   apiKey,
//   organizationId,
//   open,
//   onOpenChange,
// }: {
//   apiKey: ApiKey;
//   organizationId: string;
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }) {
//   const queryClient = useQueryClient();

//   const { mutate: deleteApiKey, isPending } = useMutation(
//     trpc.organization.apiKey.deleteApiKey.mutationOptions({
//       onSuccess: () => {
//         queryClient.invalidateQueries({
//           queryKey: [["apiKey", "listApiKeys"]],
//         });
//         toast.success("API key deleted successfully");
//         onOpenChange(false);
//       },
//       onError: () => {
//         toast.error("Failed to delete API key");
//       },
//     }),
//   );

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Delete API Key</DialogTitle>
//           <DialogDescription>
//             Are you sure you want to delete this API key? This action cannot be
//             undone.
//           </DialogDescription>
//         </DialogHeader>

//         <div className="flex flex-col gap-4 py-4">
//           <div className="flex flex-col gap-1">
//             <div className="text-sm font-medium">API Key Details</div>
//             <div className="text-sm text-muted-foreground">
//               Created: {formatDate(new Date(apiKey.createdAt))}
//               {apiKey.expiresAt && (
//                 <> • Expires: {formatDate(new Date(apiKey.expiresAt))}</>
//               )}
//             </div>
//           </div>
//         </div>

//         <DialogFooter>
//           <Button
//             variant="outline"
//             onClick={() => onOpenChange(false)}
//             disabled={isPending}
//           >
//             Cancel
//           </Button>
//           <Button
//             variant="destructive"
//             onClick={() =>
//               deleteApiKey({ apiKeyId: apiKey.id, organizationId })
//             }
//             disabled={isPending}
//           >
//             {isPending ? "Deleting..." : "Delete API Key"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// function ApiKeyDetailsDialog({
//   apiKey,
//   open,
//   onOpenChange,
// }: {
//   apiKey: ApiKey;
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }) {
//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>API Key Details</DialogTitle>
//         </DialogHeader>

//         <div className="grid gap-4 py-4">
//           <div className="grid gap-2">
//             <div className="flex items-center gap-2">
//               <div className="text-sm font-medium">Security Type</div>
//               <div className="text-sm text-muted-foreground">
//                 {apiKey.isHashed ? "Secure (Hashed)" : "Insecure (Plain Text)"}
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               <div className="text-sm font-medium">Created By</div>
//               <div className="text-sm text-muted-foreground">
//                 {apiKey.user.name} ({apiKey.user.email})
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               <div className="text-sm font-medium">Created At</div>
//               <div className="text-sm text-muted-foreground">
//                 {formatDate(new Date(apiKey.createdAt))}
//               </div>
//             </div>

//             {apiKey.expiresAt && (
//               <div className="flex items-center gap-2">
//                 <div className="text-sm font-medium">Expires At</div>
//                 <div className="text-sm text-muted-foreground">
//                   {formatDate(new Date(apiKey.expiresAt))}
//                 </div>
//               </div>
//             )}

//             {apiKey.lastUsed && (
//               <div className="flex items-center gap-2">
//                 <div className="text-sm font-medium">Last Used</div>
//                 <div className="text-sm text-muted-foreground">
//                   {formatDate(new Date(apiKey.lastUsed))}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         <DialogFooter>
//           <Button onClick={() => onOpenChange(false)}>Close</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

export const columns = ({
  organizationId,
}: {
  organizationId: string;
}): ColumnDef<Invite>[] => [
  {
    header: "Email",
    accessorKey: "email",
    cell: ({ row }) => {
      const email = row.original.email;
      return (
        <div className="max-w-[120px] truncate sm:max-w-[200px]">{email}</div>
      );
    },
  },
  {
    header: "Role",
    accessorKey: "role",
    cell: ({ row }) => {
      const role = row.original.role;
      return (
        <div className="flex max-w-[150px] items-center gap-2 sm:max-w-[300px]">
          <span className="truncate font-mono text-sm">{role}</span>
        </div>
      );
    },
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <div className="flex max-w-[150px] items-center gap-2 sm:max-w-[300px]">
          <span className="truncate font-mono text-sm">{status}</span>
        </div>
      );
    },
  },
  {
    header: "Expires",
    accessorKey: "expiresAt",
    cell: ({ row }) => {
      const expiresAt = row.original.expiresAt;
      return (
        <div className="max-w-[100px] truncate text-sm sm:max-w-[180px]">
          {expiresAt ? formatDate(new Date(expiresAt)) : "Never"}
        </div>
      );
    },
  },
  {
    header: "Invited By",
    accessorKey: "inviter",
    cell: ({ row }) => {
      const inviter = row.original.inviter;
      return (
        <div className="max-w-[100px] truncate text-sm sm:max-w-[180px]">
          {inviter ? `${inviter.name} (${inviter.email})` : "N/A"}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const key = row.original;
      const [showDeleteDialog, setShowDeleteDialog] = useState(false);
      const [showDetailsDialog, setShowDetailsDialog] = useState(false);

      return (
        <>
          <div className="flex w-[50px] justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setShowDetailsDialog(true)}>
                  <Info className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      );
    },
  },
];
