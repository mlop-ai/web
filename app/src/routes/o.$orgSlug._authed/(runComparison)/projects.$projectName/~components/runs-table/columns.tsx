import { Link } from "@tanstack/react-router";
import type { trpc } from "@/utils/trpc";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferOutput } from "@trpc/tanstack-react-query";
import { Eye, EyeOff } from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import { SELECTED_RUNS_LIMIT } from "./config";
import { StatusIndicator } from "@/components/layout/dashboard/sidebar";

export type Run = inferOutput<typeof trpc.runs.list>["runs"][0];

type RunId = string;

type RunColor = string;

interface ColumnsProps {
  orgSlug: string;
  projectName: string;
  onSelectionChange: (runId: RunId, isSelected: boolean) => void;
  onColorChange: (runId: RunId, color: RunColor) => void;
  runColors: Record<RunId, RunColor>;
}

export const columns = ({
  orgSlug,
  projectName,
  onSelectionChange,
  onColorChange,
  runColors,
}: ColumnsProps): ColumnDef<Run>[] => {
  return [
    {
      id: "select",
      header: ({ table }) => {
        const totalSelected = table.getSelectedRowModel().rows.length;
        const isAllSelected = table.getIsAllPageRowsSelected();
        const isDisabled =
          totalSelected >= SELECTED_RUNS_LIMIT && !isAllSelected;

        const handleToggle = () => {
          const newValue = !isAllSelected;
          table.toggleAllPageRowsSelected(newValue);
          table.getRowModel().rows.forEach((row) => {
            onSelectionChange(row.original.id, newValue);
          });
        };

        return (
          <button
            onClick={handleToggle}
            disabled={isDisabled}
            aria-label="Toggle select all"
            className="p-1"
          >
            {isAllSelected ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        );
      },
      cell: ({ row, table }) => {
        const totalSelected = table.getSelectedRowModel().rows.length;
        const isSelected = row.getIsSelected();
        const isDisabled = totalSelected >= SELECTED_RUNS_LIMIT && !isSelected;

        const handleClick = () => {
          const newValue = !isSelected;
          row.toggleSelected(newValue);
          onSelectionChange(row.original.id, newValue);
        };

        return (
          <button
            onClick={handleClick}
            disabled={isDisabled}
            aria-label="Toggle select row"
            className="p-1"
          >
            {isSelected ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => {
        const runId = row.original.id;
        const name = row.original.name;
        const color = runColors[runId];

        return (
          <div className="flex items-center gap-2">
            <ColorPicker
              color={color}
              onChange={(newColor) => onColorChange(runId, newColor)}
              className="h-5 w-5"
            />
            <Link
              to="/o/$orgSlug/projects/$projectName/$runId"
              preload="intent"
              className="group flex items-center rounded-md transition-colors hover:bg-accent/50"
              params={{ orgSlug, projectName, runId }}
            >
              <span className="max-w-[8rem] truncate text-sm font-medium group-hover:underline">
                {name}
              </span>
            </Link>
            <div className="ml-auto pr-2">
              <StatusIndicator status={row.original.status} />
            </div>
          </div>
        );
      },
    },
  ];
};
