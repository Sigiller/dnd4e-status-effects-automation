import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { DURATION_CHOICES } from "../config.js";
import { PALETTE_COLUMNS } from "../constants.js";
import { formatMessage, localize } from "../i18n.js";
import {
  applyPaletteColumns,
  clampColumns,
  columnsFromDrag,
  getPaletteColumns,
  setPaletteColumns,
} from "./palette-columns.js";
import { DurationBadge, DurationButton, DurationRow, Grip, GripRow } from "./PaletteControls.styles.js";

export interface PaletteControlsProps {
  /** Core's `.palette.status-effects` element. */
  palette: HTMLElement;
  /** Host appended at the end of the palette, for the resize grip. */
  gripHost: HTMLElement;
  selectedDuration: string;
  onSelectDuration: (durationId: string) => void;
}

interface DurationOption {
  id: string;
  icon: string;
  badge?: string;
  label: string;
}

function durationOptions(): DurationOption[] {
  return DURATION_CHOICES.flatMap((choice) => {
    const labelKey = choice.label ?? CONFIG.DND4E.durationType[choice.id]?.label;
    if (!labelKey) return [];
    return [{ id: choice.id, icon: choice.icon, badge: choice.badge, label: localize(labelKey) }];
  });
}

function DurationPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (durationId: string) => void;
}) {
  return (
    <DurationRow>
      {durationOptions().map((option) => (
        <DurationButton
          key={option.id}
          type="button"
          $active={option.id === selected}
          aria-pressed={option.id === selected}
          aria-label={option.label}
          data-tooltip-text={option.label}
          onClick={() => onSelect(option.id)}
        >
          <i className={`fa-solid ${option.icon}`} aria-hidden />
          {option.badge && <DurationBadge className={`fa-solid ${option.badge}`} aria-hidden />}
        </DurationButton>
      ))}
    </DurationRow>
  );
}

interface DragState {
  startX: number;
  startColumns: number;
  columnWidth: number;
}

/** Grip that changes the palette's icons per row (PALETTE_COLUMNS) by dragging or with arrow keys. */
function ResizeGrip({ palette }: { palette: HTMLElement }) {
  const [columns, setColumns] = useState(getPaletteColumns);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);
  const label = formatMessage("DSEA.PaletteResize", { min: PALETTE_COLUMNS.min, max: PALETTE_COLUMNS.max });

  useLayoutEffect(() => {
    applyPaletteColumns(palette, columns);
  }, [palette, columns]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    // The grip's tooltip would otherwise stay on screen where the drag started.
    game.tooltip?.deactivate();
    const style = getComputedStyle(palette);
    drag.current = {
      startX: event.clientX,
      startColumns: columns,
      columnWidth:
        parseFloat(style.getPropertyValue("--effect-size")) + parseFloat(style.getPropertyValue("--effect-gap")),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    setColumns(columnsFromDrag(state.startColumns, event.clientX - state.startX, state.columnWidth));
  };

  const endDrag = () => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    setDragging(false);
    if (columns !== state.startColumns) void setPaletteColumns(columns);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    event.stopPropagation();
    const next = clampColumns(columns + step);
    if (next === columns) return;
    setColumns(next);
    void setPaletteColumns(next);
  };

  return (
    <GripRow>
      <Grip
        $dragging={dragging}
        tabIndex={0}
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={PALETTE_COLUMNS.min}
        aria-valuemax={PALETTE_COLUMNS.max}
        aria-valuenow={columns}
        data-tooltip-text={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <i className="fa-solid fa-grip-lines-vertical" aria-hidden />
      </Grip>
    </GripRow>
  );
}

export function PaletteControls({ palette, gripHost, selectedDuration, onSelectDuration }: PaletteControlsProps) {
  return (
    <>
      <DurationPicker selected={selectedDuration} onSelect={onSelectDuration} />
      {createPortal(<ResizeGrip palette={palette} />, gripHost)}
    </>
  );
}
