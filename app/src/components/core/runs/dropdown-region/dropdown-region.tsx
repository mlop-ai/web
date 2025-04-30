"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Pin,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  MoveDiagonal2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import styles from "./dropdown-region.module.css";
import { Slider } from "@/components/ui/slider";
import { RiDragMoveFill } from "@remixicon/react";

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 8;
const DEFAULT_COLUMNS = 3;

const MIN_ROWS = 1;
const MAX_ROWS = 8;
const DEFAULT_ROWS = 3;

const DEFAULT_GRID_SIZE = 8;
const DEFAULT_SELECTED_COLS = 3;
const DEFAULT_SELECTED_ROWS = 3;

// Minimum height is now set in CSS via min-height in styles.card

interface DropdownSettings {
  isOpen: boolean;
  columns: number;
  rows: number;
  pinnedIndices: number[];
  currentPage: number;
  globalCardHeight: number | null;
}

export function resetDropdownRegion(groupId: string) {
  localStorage.removeItem(`dropdown_${groupId}`);
}

export function saveToLocalStorage(
  groupId: string,
  settings: DropdownSettings,
) {
  localStorage.setItem(`dropdown_${groupId}`, JSON.stringify(settings));
}

export function loadFromLocalStorage(groupId: string): DropdownSettings | null {
  const saved = localStorage.getItem(`dropdown_${groupId}`);
  return saved ? JSON.parse(saved) : null;
}

interface DropdownRegionProps {
  title: string;
  components: React.ReactNode[];
  groupId: string;
}

interface GridSelectorProps {
  onSelect: (rows: number, columns: number) => void;
  selectedRows: number;
  selectedColumns: number;
}

const GridSelector = ({
  onSelect,
  selectedRows,
  selectedColumns,
}: GridSelectorProps) => {
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleCellHover = useCallback(
    (row: number, col: number) => {
      if (isDragging) {
        onSelect(row + 1, col + 1);
      }
      setHoveredCell({ row, col });
    },
    [isDragging, onSelect],
  );

  const handleMouseDown = useCallback(
    (row: number, col: number) => {
      setIsDragging(true);
      onSelect(row + 1, col + 1);
      setHoveredCell({ row, col });
    },
    [onSelect],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setHoveredCell(null);
  }, []);

  return (
    <div className="mt-4">
      <div className="mb-2 text-sm font-medium">Select Grid Size</div>
      <div
        className="grid aspect-square w-full gap-1 rounded-lg border p-2"
        style={{
          gridTemplateColumns: `repeat(${DEFAULT_GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${DEFAULT_GRID_SIZE}, 1fr)`,
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {Array.from({ length: DEFAULT_GRID_SIZE * DEFAULT_GRID_SIZE }).map(
          (_, i) => {
            const row = Math.floor(i / DEFAULT_GRID_SIZE);
            const col = i % DEFAULT_GRID_SIZE;
            const isSelected = row < selectedRows && col < selectedColumns;
            const isHovered =
              hoveredCell && row <= hoveredCell.row && col <= hoveredCell.col;

            // A cell would be removed if it's currently selected but would not be selected
            // based on the new hover position
            const wouldBeRemoved =
              isSelected &&
              hoveredCell &&
              (row > hoveredCell.row || col > hoveredCell.col);

            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded transition-colors",
                  isSelected
                    ? wouldBeRemoved
                      ? "bg-destructive/30"
                      : "bg-primary"
                    : isHovered
                      ? "bg-primary/30"
                      : "bg-muted hover:bg-muted/80",
                )}
                onMouseDown={() => handleMouseDown(row, col)}
                onMouseEnter={() => handleCellHover(row, col)}
              />
            );
          },
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Selected: {selectedColumns} × {selectedRows}
        </span>
        <span>
          Max: {DEFAULT_GRID_SIZE} × {DEFAULT_GRID_SIZE}
        </span>
      </div>
    </div>
  );
};

interface DraggingState {
  index: number;
  startX: number;
  startY: number;
  initialWidth: number;
  initialHeight: number;
  containerWidth: number;
  initialRect: DOMRect;
}

interface GhostDimensions {
  width: number;
  height: number;
  top: number;
  left: number;
}

export function DropdownRegion({
  title,
  components,
  groupId,
}: DropdownRegionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [pinnedIndices, setPinnedIndices] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [tempColumns, setTempColumns] = useState(DEFAULT_COLUMNS.toString());
  const [tempRows, setTempRows] = useState(DEFAULT_ROWS.toString());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [draggingState, setDraggingState] = useState<DraggingState | null>(
    null,
  );
  const [ghostDimensions, setGhostDimensions] =
    useState<GhostDimensions | null>(null);
  const [globalCardHeight, setGlobalCardHeight] = useState<number | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const itemsPerPage = columns * rows;

  useEffect(() => {
    const savedSettings = loadFromLocalStorage(groupId);
    if (savedSettings) {
      console.log("[Effect Load] Loading settings:", savedSettings);
      setIsOpen(savedSettings.isOpen);
      setColumns(savedSettings.columns);
      setRows(savedSettings.rows);
      setPinnedIndices(savedSettings.pinnedIndices);
      setCurrentPage(savedSettings.currentPage);
      setTempColumns(savedSettings.columns.toString());
      setTempRows(savedSettings.rows.toString());
      setGlobalCardHeight(savedSettings.globalCardHeight ?? null);
    } else {
      console.log("[Effect Load] No saved settings found.");
    }
  }, [groupId]);

  useEffect(() => {
    const gridElement = gridContainerRef.current;
    if (!gridElement) {
      console.log("ResizeObserver: Grid element not found initially.");
      return;
    }

    let initialWidthSet = false; // Flag to set initial width only once reliably

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const newWidth = entries[0].contentRect.width;
        console.log("ResizeObserver triggered. New width:", newWidth);
        setContainerWidth(newWidth);
        if (!initialWidthSet) {
          initialWidthSet = true; // Prevent resetting if offsetWidth was read before final layout
        }
      }
    });

    resizeObserver.observe(gridElement);

    // Attempt initial width set after a short delay to allow rendering
    const timeoutId = setTimeout(() => {
      if (gridElement.offsetWidth > 0 && !initialWidthSet) {
        console.log(
          "Setting initial container width via offsetWidth:",
          gridElement.offsetWidth,
        );
        setContainerWidth(gridElement.offsetWidth);
        initialWidthSet = true;
      } else if (!initialWidthSet) {
        console.log(
          "Initial offsetWidth check: gridElement.offsetWidth is 0 or already set by observer.",
        );
      }
    }, 100); // Increased delay slightly

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      console.log("ResizeObserver disconnected.");
    };
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    const unpinnedCount = components.length - pinnedIndices.length;
    const maxPages = Math.max(1, Math.ceil(unpinnedCount / itemsPerPage));
    if (currentPage > maxPages) {
      setCurrentPage(maxPages);
    }
  }, [components.length, pinnedIndices.length, itemsPerPage, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil((components.length - pinnedIndices.length) / itemsPerPage),
  );

  useEffect(() => {
    const settingsToSave: DropdownSettings = {
      isOpen,
      columns,
      rows,
      pinnedIndices,
      currentPage,
      globalCardHeight,
    };
    console.log("[Effect Save] Saving settings:", settingsToSave);
    saveToLocalStorage(groupId, settingsToSave);
  }, [
    isOpen,
    columns,
    rows,
    pinnedIndices,
    currentPage,
    groupId,
    globalCardHeight,
  ]);

  const handleColumnChange = (value: string) => {
    const numValue = parseInt(value);
    setTempColumns(value);
    if (
      !isNaN(numValue) &&
      numValue >= MIN_COLUMNS &&
      numValue <= MAX_COLUMNS
    ) {
      setColumns(numValue);
      setCurrentPage(1);
    }
  };

  const handleRowChange = (value: string) => {
    const numValue = parseInt(value);
    setTempRows(value);
    if (!isNaN(numValue) && numValue >= MIN_ROWS && numValue <= MAX_ROWS) {
      setRows(numValue);
      setCurrentPage(1);
    }
  };

  const togglePin = (index: number) => {
    setPinnedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const sortedComponents = [...components].sort((_, b) => {
    const indexB = components.indexOf(b);
    return pinnedIndices.includes(indexB) ? 1 : -1;
  });

  const unpinnedComponents = sortedComponents.filter(
    (_, index) => !pinnedIndices.includes(index),
  );

  const currentPageStart = Math.max(0, (currentPage - 1) * itemsPerPage);
  const currentPageEnd = Math.min(
    unpinnedComponents.length,
    currentPageStart + itemsPerPage,
  );

  const currentPageComponents = unpinnedComponents.slice(
    currentPageStart,
    currentPageEnd,
  );

  const displayComponents = [
    ...sortedComponents.filter((_, index) => pinnedIndices.includes(index)),
    ...currentPageComponents,
  ];

  const handleGridSelect = (newRows: number, newColumns: number) => {
    setRows(newRows);
    setColumns(newColumns);
    setTempRows(newRows.toString());
    setTempColumns(newColumns.toString());
    setCurrentPage(1);
  };

  const handleResizeMouseDown = useCallback(
    (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
      console.log(
        `[MouseDown Attempt] Index: ${index}, Timestamp: ${Date.now()}`,
      ); // Log every attempt

      // --- Look up Ref & Check Dimensions FIRST ---
      const cardElement = cardRefs.current?.[index] ?? null;
      if (!cardElement) {
        console.error(
          `[MouseDown PreCheck FAIL] Card element for index ${index} is null! Aborting.`,
        );
        return;
      }
      const initialCardRect = cardElement.getBoundingClientRect();
      // Also check height which might be 0 initially if content hasn't loaded
      if (initialCardRect.width <= 0 || initialCardRect.height <= 0) {
        console.error(
          `[MouseDown PreCheck FAIL] Card element initial dimensions invalid (${initialCardRect.width}x${initialCardRect.height})! Aborting.`,
        );
        return;
      }
      console.log(
        `[MouseDown PreCheck OK] Initial card rect:`,
        initialCardRect,
      );

      // --- Check Container Width ---
      let currentContainerWidth = containerWidth;
      let usedFallbackWidth = false;
      if (!currentContainerWidth || currentContainerWidth <= 0) {
        console.warn(
          "[MouseDown] containerWidth state is invalid (value: ${containerWidth}), trying fallback.",
        );
        currentContainerWidth = gridContainerRef.current?.offsetWidth ?? 0;
        if (currentContainerWidth <= 0) {
          console.error(
            "[MouseDown PreCheck FAIL] Fallback containerWidth is also invalid (value: ${currentContainerWidth})! Aborting.",
          );
          return;
        }
        usedFallbackWidth = true;
        console.log(
          `[MouseDown PreCheck OK] Using fallback containerWidth: ${currentContainerWidth}`,
        );
      } else {
        console.log(
          `[MouseDown PreCheck OK] Using state containerWidth: ${currentContainerWidth}`,
        );
      }

      // --- Event Setup ---
      event.preventDefault();
      event.stopPropagation();
      console.log("[MouseDown] Prevented Default & Stopped Propagation");

      // --- Create Dragging State ---
      const newDraggingState: DraggingState = {
        index: index,
        startX: event.clientX,
        startY: event.clientY,
        initialWidth: initialCardRect.width,
        initialHeight: initialCardRect.height,
        containerWidth: currentContainerWidth,
        initialRect: initialCardRect,
      };

      // Create local closure variables for the mousemove handler
      const startX = event.clientX;
      const startY = event.clientY;
      const initialWidth = initialCardRect.width;
      const initialHeight = initialCardRect.height;

      // --- Setup Custom Move Handler that doesn't rely on React state ---
      const localMouseMoveHandler = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        // Calculate both deltas using closure variables
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        // Calculate new width and height, applying minimums
        const newWidth = Math.max(50, initialWidth + deltaX);
        const newHeight = Math.max(384, initialHeight + deltaY);

        // Update ghost overlay with both dimensions
        setGhostDimensions({
          width: newWidth,
          height: newHeight,
          top: initialCardRect.top,
          left: initialCardRect.left,
        });
      };

      // --- Setup Custom Up Handler ---
      const localMouseUpHandler = (upEvent: MouseEvent) => {
        console.log("[MouseUp] Triggered with local handler");
        upEvent.preventDefault();
        upEvent.stopPropagation();

        // --- Reset Listeners & Styles FIRST ---
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", localMouseMoveHandler);
        window.removeEventListener("mouseup", localMouseUpHandler);
        console.log("[MouseUp] Removed global listeners.");

        // --- Clear Temp State ---
        setDraggingState(null);
        setGhostDimensions(null);
        console.log("[MouseUp] Reset draggingState and ghostDimensions.");

        // --- Calculate Final Dimensions ---
        const deltaX = upEvent.clientX - startX;
        const deltaY = upEvent.clientY - startY;
        const finalTargetWidth = Math.max(50, initialWidth + deltaX);
        const finalTargetHeight = Math.max(384, initialHeight + deltaY);
        console.log(
          `[MouseUp] Drag finished. Index: ${index}, Final W/H: ${finalTargetWidth}/${finalTargetHeight}`,
        );

        // --- Update GLOBAL Height State ---
        setGlobalCardHeight(finalTargetHeight);
        console.log(
          `[MouseUp] Updated globalCardHeight to: ${finalTargetHeight}`,
        );

        // --- Update Columns Based on Width ---
        const availableWidth = currentContainerWidth;
        const gap = 16;
        if (availableWidth <= 0 || finalTargetWidth <= gap) {
          console.error(
            `[MouseUp] Invalid dimensions for column calculation: availableWidth=${availableWidth}, finalTargetWidth=${finalTargetWidth}`,
          );
          return;
        }
        const potentialColumns = Math.max(
          1,
          Math.floor(availableWidth / (finalTargetWidth + gap)),
        );
        const newColumns = Math.max(
          MIN_COLUMNS,
          Math.min(MAX_COLUMNS, potentialColumns),
        );
        console.log(
          `[MouseUp] Calculated potentialColumns=${potentialColumns}, newColumns=${newColumns}`,
        );
        if (newColumns !== columns) {
          console.log(
            `[MouseUp] Updating columns from ${columns} to ${newColumns}`,
          );
          setColumns(newColumns);
          setTempColumns(newColumns.toString());
          setCurrentPage(1);
        } else {
          console.log(
            `[MouseUp] No column change needed (${newColumns} === ${columns}).`,
          );
        }
      };

      // --- Set state (needed for UI updates) ---
      setDraggingState(newDraggingState);
      setGhostDimensions({
        width: initialCardRect.width,
        height: initialCardRect.height,
        top: initialCardRect.top,
        left: initialCardRect.left,
      });
      console.log("[MouseDown] setDraggingState & setGhostDimensions called.");

      // --- Global Listeners with local handlers ---
      try {
        window.addEventListener("mousemove", localMouseMoveHandler);
        console.log("[MouseDown] Added mousemove listener with local handler.");
        window.addEventListener("mouseup", localMouseUpHandler);
        console.log("[MouseDown] Added mouseup listener with local handler.");
      } catch (error) {
        console.error("[MouseDown FAIL] Error adding global listeners:", error);
        // Clean up potentially added listener & state
        window.removeEventListener("mousemove", localMouseMoveHandler);
        setDraggingState(null);
        setGhostDimensions(null);
        return;
      }

      // --- Cursor/Selection Style ---
      try {
        document.body.style.cursor = "nwse-resize";
        document.body.style.userSelect = "none";
        console.log("[MouseDown] Set global cursor and userSelect.");
      } catch (error) {
        console.error("[MouseDown FAIL] Error setting body style:", error);
        // Attempt cleanup of listeners & state
        window.removeEventListener("mousemove", localMouseMoveHandler);
        window.removeEventListener("mouseup", localMouseUpHandler);
        setDraggingState(null);
        setGhostDimensions(null);
        // Attempt to reset cursor if possible
        try {
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        } catch {}
        return;
      }

      console.log(
        `[MouseDown Complete] Successfully set up drag for index ${index}`,
      );
    },
    [
      containerWidth,
      columns,
      gridContainerRef,
      setColumns,
      setTempColumns,
      setCurrentPage,
      setGlobalCardHeight,
    ],
  );

  const handleResizeMouseMove = useCallback(
    (event: MouseEvent) => {
      // This handler is now only used for the React state-based approach
      // and serves as a fallback. The local handlers in mousedown are preferred.
      if (!draggingState || !draggingState.initialRect) {
        console.warn("[MouseMove] No dragging state or initialRect");
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      // Calculate both deltas
      const deltaX = event.clientX - draggingState.startX;
      const deltaY = event.clientY - draggingState.startY;

      // Calculate new width and height, applying minimums
      const newWidth = Math.max(50, draggingState.initialWidth + deltaX);
      const newHeight = Math.max(384, draggingState.initialHeight + deltaY);

      // Update ghost overlay with both dimensions
      setGhostDimensions({
        width: newWidth,
        height: newHeight,
        top: draggingState.initialRect.top,
        left: draggingState.initialRect.left,
      });
    },
    [draggingState],
  );

  return (
    <div className="w-full rounded-lg border shadow-sm">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="focus:outline-none"
          >
            {isOpen ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          <h2 className="flex w-full items-center justify-center text-center text-lg font-semibold">
            <div>{title}</div>
            <span className="ml-3 inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-1 text-xs leading-none font-bold text-blue-100">
              {components.length}
            </span>
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {totalPages > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Grid Layout Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <GridSelector
                  onSelect={handleGridSelect}
                  selectedRows={rows}
                  selectedColumns={columns}
                />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="columns">Columns</Label>
                      <span className="text-sm text-muted-foreground">
                        {columns} columns
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="columns"
                        min={MIN_COLUMNS}
                        max={MAX_COLUMNS}
                        value={[columns]}
                        onValueChange={([value]) => {
                          handleColumnChange(value.toString());
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={MIN_COLUMNS}
                        max={MAX_COLUMNS}
                        value={tempColumns}
                        onChange={(e) => handleColumnChange(e.target.value)}
                        className="w-16"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="rows">Rows</Label>
                      <span className="text-sm text-muted-foreground">
                        {rows} rows
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="rows"
                        min={MIN_ROWS}
                        max={MAX_ROWS}
                        value={[rows]}
                        onValueChange={([value]) => {
                          handleRowChange(value.toString());
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={MIN_ROWS}
                        max={MAX_ROWS}
                        value={tempRows}
                        onChange={(e) => handleRowChange(e.target.value)}
                        className="w-16"
                      />
                    </div>
                  </div>
                </div>

                {(parseInt(tempColumns) > MAX_COLUMNS ||
                  parseInt(tempColumns) < MIN_COLUMNS ||
                  parseInt(tempRows) > MAX_ROWS ||
                  parseInt(tempRows) < MIN_ROWS) && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {parseInt(tempColumns) > MAX_COLUMNS && (
                      <p>Maximum {MAX_COLUMNS} columns allowed</p>
                    )}
                    {parseInt(tempColumns) < MIN_COLUMNS && (
                      <p>Minimum {MIN_COLUMNS} column required</p>
                    )}
                    {parseInt(tempRows) > MAX_ROWS && (
                      <p>Maximum {MAX_ROWS} rows allowed</p>
                    )}
                    {parseInt(tempRows) < MIN_ROWS && (
                      <p>Minimum {MIN_ROWS} row required</p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetDropdownRegion(groupId);
                    window.location.reload();
                  }}
                >
                  Reset Layout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {isOpen && (
        <div className="p-4" ref={gridContainerRef}>
          <div
            className={cn(
              styles.grid,
              draggingState && "cursor-nwse-resize select-none",
            )}
            style={
              {
                "--grid-cols-tablet": Math.min(2, columns),
                "--grid-cols-desktop": columns,
              } as React.CSSProperties
            }
          >
            {displayComponents.map((component) => {
              const originalIndex = components.indexOf(component);
              const isPinned = pinnedIndices.includes(originalIndex);
              const cardStyle: React.CSSProperties = {};
              if (globalCardHeight !== null) {
                cardStyle.height = `${globalCardHeight}px`;
              }

              return (
                <div
                  key={originalIndex}
                  ref={(el) => {
                    if (cardRefs.current) {
                      cardRefs.current[originalIndex] = el;
                    }
                  }}
                  className={cn(styles.card, "group")}
                  style={cardStyle}
                >
                  {component}
                  {/* Single Resize Handle (Bottom Right) */}
                  <button
                    onMouseDown={(e) => handleResizeMouseDown(originalIndex, e)}
                    className={cn(
                      "absolute -right-2 -bottom-2 z-30 h-5 w-5 cursor-nwse-resize rounded-full border bg-background p-1 text-muted-foreground shadow transition-opacity",
                      "opacity-0 group-hover:opacity-100",
                      draggingState?.index === originalIndex && "!opacity-100",
                      draggingState &&
                        draggingState.index !== originalIndex &&
                        "!group-hover:opacity-0 !opacity-0",
                    )}
                    aria-label="Resize card"
                  >
                    <MoveDiagonal2 className="h-full w-full" />
                  </button>
                </div>
              );
            })}
          </div>
          {ghostDimensions && (
            <div
              className="pointer-events-none fixed z-40 border-2 border-dashed border-blue-500 bg-blue-100/30"
              style={{
                width: `${ghostDimensions.width}px`,
                height: `${ghostDimensions.height}px`,
                top: `${ghostDimensions.top}px`,
                left: `${ghostDimensions.left}px`,
                transition: "none",
              }}
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
}
