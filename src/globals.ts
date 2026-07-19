/**
 * globals.ts — Project-wide constants used across engine, UI, and wirerouter.
 *
 * These are the foundational layout and spacing values that everything depends on.
 * Change these to adjust the entire grid system globally.
 */

/** Grid cell size in pixels — the fundamental unit of the canvas grid */
export const CELL_SIZE = 5;

/** Pin spacing in grid units (actual px = PIN_SPACING_UNITS * CELL_SIZE) */
export const PIN_SPACING_UNITS = 3;

/** Minimum component width/height in pixels */
export const MIN_COMP_SIZE = 60;
