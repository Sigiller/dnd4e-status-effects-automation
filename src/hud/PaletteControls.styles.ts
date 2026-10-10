import styled, { css } from "styled-components";

/**
 * Both controls are direct grid items of core's `#token-hud .status-effects` palette (their React hosts use
 * `display: contents`), so they size themselves with core's --effect-* variables.
 */

export const DurationRow = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(var(--effect-columns), var(--effect-size));
  gap: var(--effect-gap);
  position: sticky;
  top: calc(-1 * var(--effect-gap));
  z-index: 1;
  padding-bottom: var(--effect-gap);
  margin-bottom: var(--effect-gap);
  border-bottom: 1px solid var(--control-border-color);
  background: var(--control-bg-color);
`;

export const DurationButton = styled.button<{ $active: boolean }>`
  position: relative;
  width: var(--effect-size);
  height: var(--effect-size);
  min-height: 0;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radiusControl};
  background: none;
  color: var(--control-icon-color);
  font-size: var(--font-size-14);
  opacity: 0.5;
  cursor: var(--cursor-pointer);

  &:hover {
    opacity: 0.8;
    color: var(--control-hover-icon-color);
  }

  ${({ $active }) =>
    $active &&
    css`
      opacity: 1;
      color: var(--control-active-icon-color);
      border-color: var(--control-active-border-color);
    `}
`;

export const DurationBadge = styled.i`
  position: absolute;
  right: 1px;
  bottom: 1px;
  font-size: 8px;
`;

/** Zero-height sticky row at the end of the palette, keeping the grip in the bottom-right corner while scrolling. */
export const GripRow = styled.div`
  grid-column: 1 / -1;
  position: sticky;
  bottom: 0;
  height: 0;
  margin-top: calc(-1 * var(--effect-gap));
  z-index: 1;
`;

export const Grip = styled.div<{ $dragging: boolean }>`
  position: absolute;
  right: calc(-1 * var(--effect-gap));
  bottom: calc(-1 * var(--effect-gap));
  width: 12px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radiusControl} 0 ${({ theme }) => theme.radiusControl} 0;
  background: var(--control-bg-color);
  color: var(--control-icon-color);
  font-size: 10px;
  opacity: ${({ $dragging }) => ($dragging ? 1 : 0.6)};
  cursor: ew-resize;
  touch-action: none;

  &:hover,
  &:focus-visible {
    opacity: 1;
    color: var(--control-hover-icon-color);
  }
`;
