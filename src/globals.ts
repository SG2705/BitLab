/**
 * globals.ts — Project-wide constants used across engine, UI, and wirerouter.
 *
 * These are the foundational layout and spacing values that everything depends on.
 * Change these to adjust the entire grid system globally.
 */

// Primary
/** Grid cell size in pixels — the fundamental unit of the canvas grid */
export const CELL_SIZE = 5;
/** Pin spacing in grid units (actual px = PIN_SPACING_UNITS * CELL_SIZE) */
export const PIN_SPACING_UNITS = 3;
/** Minimum component width/height in pixels in relative settings */
export const MIN_COMP_SIZE_UNITS = 12;
/** Pin offset in grid units (actual px = PIN_OFFSET_UNITS * CELL_SIZE) */
export const PIN_OFFSET_UNITS = 2;

// Secondary
/** Minimum component width/height in pixels */
export const MIN_COMP_SIZE = MIN_COMP_SIZE_UNITS * CELL_SIZE;
/** Pin offset in pixels — distance from component edge to pin center */
export const PIN_OFFSET = PIN_OFFSET_UNITS * CELL_SIZE;
