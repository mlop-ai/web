"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Pin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import styles from "./dropdown-region.module.css";
import { Slider } from "@/components/ui/slider";

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 8;
const DEFAULT_COLUMNS = 3;

const MIN_ROWS = 1;
const MAX_ROWS = 8;
const DEFAULT_ROWS = 3;

const DEFAULT_GRID_SIZE = 8;
const DEFAULT_SELECTED_COLS = 3;
const DEFAULT_SELECTED_ROWS = 3;

interface DropdownSettings {
  isOpen: boolean;
  columns: number;
  rows: number;
  pinnedIndices: number[];
  currentPage: number;
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

export function DropdownRegion({
  title,
  components,
  groupId,
}: DropdownRegionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [columns, setColumns] = useState(() => {
    const savedSettings = loadFromLocalStorage(groupId);
    return savedSettings?.columns ?? DEFAULT_COLUMNS;
  });
  const [rows, setRows] = useState(() => {
    const savedSettings = loadFromLocalStorage(groupId);
    return savedSettings?.rows ?? DEFAULT_ROWS;
  });
  const [pinnedIndices, setPinnedIndices] = useState<number[]>(() => {
    const savedSettings = loadFromLocalStorage(groupId);
    return savedSettings?.pinnedIndices ?? [];
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const savedSettings = loadFromLocalStorage(groupId);
    return savedSettings?.currentPage ?? 1;
  });

  const [tempColumns, setTempColumns] = useState(columns.toString());
  const [tempRows, setTempRows] = useState(rows.toString());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const itemsPerPage = columns * rows;

  // Ensure currentPage is valid when total pages changes
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

  // Save settings to localStorage
  useEffect(() => {
    saveToLocalStorage(groupId, {
      isOpen,
      columns,
      rows,
      pinnedIndices,
      currentPage,
    });
  }, [isOpen, columns, rows, pinnedIndices, currentPage, groupId]);

  const handleColumnChange = (value: string) => {
    const numValue = parseInt(value);
    setTempColumns(value);
    if (
      !isNaN(numValue) &&
      numValue >= MIN_COLUMNS &&
      numValue <= MAX_COLUMNS
    ) {
      setColumns(numValue);
      setCurrentPage(1); // Reset to first page when changing layout
    }
  };

  const handleRowChange = (value: string) => {
    const numValue = parseInt(value);
    setTempRows(value);
    if (!isNaN(numValue) && numValue >= MIN_ROWS && numValue <= MAX_ROWS) {
      setRows(numValue);
      setCurrentPage(1); // Reset to first page when changing layout
    }
  };

  const togglePin = (index: number) => {
    setPinnedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  // Sort components with pinned items first
  const sortedComponents = [...components].sort((_, b) => {
    const indexB = components.indexOf(b);
    return pinnedIndices.includes(indexB) ? 1 : -1;
  });

  // Get current page items (excluding pinned items)
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

  // Combine pinned and current page components
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
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {isOpen && (
        <div className="p-4">
          <div
            className={styles.grid}
            style={
              {
                "--grid-cols-tablet": Math.min(2, columns),
                "--grid-cols-desktop": columns,
              } as React.CSSProperties
            }
          >
            {displayComponents.map((component, index) => {
              const originalIndex = components.indexOf(component);
              const isPinned = pinnedIndices.includes(originalIndex);
              return (
                <div
                  key={originalIndex}
                  className="group relative overflow-hidden rounded-lg border bg-background shadow-sm"
                  style={{ height: "fit-content" }}
                >
                  {/* <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePin(originalIndex)}
                    className={cn(
                      "absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100",
                      isPinned && "text-blue-500 opacity-100",
                    )}
                  >
                    <Pin
                      className="h-4 w-4"
                      fill={isPinned ? "currentColor" : "none"}
                    />
                  </Button> */}
                  {component}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
