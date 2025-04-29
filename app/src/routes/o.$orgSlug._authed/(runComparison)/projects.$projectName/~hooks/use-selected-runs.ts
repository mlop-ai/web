import { useState, useEffect, useCallback, useMemo } from "react";
import type { inferOutput } from "@trpc/tanstack-react-query";
import type { trpc } from "@/utils/trpc";
import { COLORS } from "@/components/ui/color-picker";

type Run = inferOutput<typeof trpc.runs.list>["runs"][number];

// alias types for documentation purposes
type Color = string;
type RunId = string;

interface UseSelectedRunsReturn {
  /** Map of all run IDs to their assigned colors */
  runColors: Record<RunId, Color>;
  /** Map of selected run IDs to their run data and color */
  selectedRunsWithColors: Record<RunId, { run: Run; color: Color }>;
  /** Handler for selecting/deselecting runs */
  handleRunSelection: (runId: RunId, isSelected: boolean) => void;
  /** Handler for changing a run's color */
  handleColorChange: (runId: RunId, color: Color) => void;
  /** Initial row selection state for the table
   * this is the index of the run in the runs array
   * mapped to a boolean value indicating if the run is selected
   */
  defaultRowSelection: Record<number, boolean>;
}

/**
 * Get a deterministic color based on the run name
 * @param runName - The name of the run to generate a color for
 * @returns A color from the predefined palette
 */
const getColorForRun = (runName: string): Color => {
  // Simple hash function to convert string to number
  const hash = runName.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Use the hash to select a color from the palette
  return COLORS[Math.abs(hash) % COLORS.length];
};

/**
 * Custom hook for managing run selection and color assignment
 *
 * Features:
 * - Assigns deterministic colors to runs based on their names
 * - Maintains color consistency across selections
 * - Automatically selects the 5 most recent runs initially
 * - Provides handlers for selection and color changes
 *
 * @param runs - Array of run objects from the API
 * @returns Object containing state and handlers for run selection and colors
 */
export function useSelectedRuns(
  runs: Run[] | undefined,
): UseSelectedRunsReturn {
  // Store all run colors, whether selected or not
  const [runColors, setRunColors] = useState<Record<RunId, Color>>({});
  const [selectedRunsWithColors, setSelectedRunsWithColors] = useState<
    Record<RunId, { run: Run; color: Color }>
  >({});

  // Initialize or update colors when runs change
  useEffect(() => {
    if (!runs?.length) return;

    // Only initialize colors if they haven't been set yet
    if (Object.keys(runColors).length === 0) {
      const newColors = runs.reduce<Record<RunId, Color>>((acc, run) => {
        acc[run.id] = getColorForRun(run.id);
        return acc;
      }, {});

      setRunColors(newColors);

      // Initialize selected runs only if none are selected yet
      if (Object.keys(selectedRunsWithColors).length === 0) {
        const latestRuns = runs.slice(0, 5);
        const newSelectedRuns = latestRuns.reduce<
          Record<RunId, { run: Run; color: Color }>
        >((acc, run) => {
          acc[run.id] = {
            run,
            color: newColors[run.id],
          };
          return acc;
        }, {});

        setSelectedRunsWithColors(newSelectedRuns);
      }
    }
  }, [runs]); // Only depend on runs changing

  // Memoize handlers to prevent unnecessary rerenders
  const handleRunSelection = useCallback(
    (runId: RunId, isSelected: boolean) => {
      if (!runs) return;

      // Use functional update to ensure we're working with latest state
      setSelectedRunsWithColors((prev) => {
        // If already in desired state, don't update
        const isCurrentlySelected = !!prev[runId];
        if (isSelected === isCurrentlySelected) {
          return prev;
        }

        if (isSelected) {
          // Find the run from the runs array
          const run = runs.find((r) => r.id === runId);
          if (!run) return prev;

          // Ensure we have a color for this run
          const color = runColors[runId] || getColorForRun(runId);

          // Update runColors if needed
          if (!runColors[runId]) {
            setRunColors((prevColors) => ({
              ...prevColors,
              [runId]: color,
            }));
          }

          // Add the run to selected runs
          return {
            ...prev,
            [runId]: {
              run,
              color,
            },
          };
        }

        // Fast path for deselection - completely remove the run from the selected state
        const { [runId]: _, ...rest } = prev;
        return rest;
      });
    },
    [runs, runColors],
  );

  const handleColorChange = useCallback(
    (runId: RunId, color: Color) => {
      // Update both states atomically
      setRunColors((prev) => ({
        ...prev,
        [runId]: color,
      }));

      setSelectedRunsWithColors((prev) => {
        const run = prev[runId]?.run || runs?.find((r) => r.id === runId);
        if (!run) return prev;

        return {
          ...prev,
          [runId]: {
            run,
            color,
          },
        };
      });
    },
    [runs],
  );

  // Generate defaultRowSelection based on current selectedRunsWithColors
  const defaultRowSelection = useMemo(() => {
    if (!runs?.length) return {};

    // If no runs are selected, select the first 5 by default
    if (Object.keys(selectedRunsWithColors).length === 0) {
      return {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
      };
    }

    // Otherwise, create selection based on currently selected runs
    const selection: Record<number, boolean> = {};
    runs.forEach((run, index) => {
      selection[index] = !!selectedRunsWithColors[run.id];
    });

    return selection;
  }, [runs, selectedRunsWithColors]);

  return {
    runColors,
    selectedRunsWithColors,
    handleRunSelection,
    handleColorChange,
    defaultRowSelection,
  };
}
