// Where each tile of the board goes on screen. Kept apart from the components so the
// layout can be read (and tested) on its own.
import type { BoardTile } from "./api.ts";

/** How many grid units wide the board is; a domino lying flat takes two units by one. */
export const BOARD_UNITS = 16;

/**
 * A tile on screen: its box in grid units (x and y may be halves, since doubles sit
 * centred across the line), whether it stands up, and the numbers in reading order
 * (left then right, or top then bottom).
 */
export type Placed = {
  tile: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vertical: boolean;
  first: number;
  second: number;
};

const isDouble = (t: BoardTile) => t.left === t.right;

/**
 * Lays the board out as one continuous snake. The first tile sits in the middle; the right
 * arm grows rightward and, at the edge, turns down and comes back the other way, while the
 * left arm grows leftward and turns up. A turn always takes two standing tiles (the
 * corner), so each run sits a clear gap away from the one before it.
 *
 * Doubles are laid across the line, centred on it, as is the custom in Puerto Rico. A
 * double at a corner keeps the snake going from one of its ends, never from its long
 * side: as the first corner tile it stands across the run and the snake drops from its
 * end; as the second it lies across the drop and the next run leaves from its end.
 *
 * Each tile shows its numbers in the order they are reached along the snake, so
 * touching halves always match.
 */
export function layOut(board: BoardTile[]): Placed[] {
  const placed: Placed[] = [];
  const center = board.find((t) => t.fromFirst === 0);
  if (center === undefined) return placed;
  const mid = BOARD_UNITS / 2;
  // Row 0 is the first run; its line runs through y = 0.5.
  const line = 0.5;
  if (isDouble(center)) {
    placed.push({ tile: center.tile, x: mid - 0.5, y: line - 1, w: 1, h: 2, vertical: true, first: center.left, second: center.right });
  } else {
    placed.push({ tile: center.tile, x: mid - 1, y: line - 0.5, w: 2, h: 1, vertical: false, first: center.left, second: center.right });
  }
  const half = isDouble(center) ? 0.5 : 1;
  // The right arm goes away from the first tile in board order, the left arm against it.
  const arms = [
    { tiles: board.filter((t) => t.fromFirst > 0).sort((a, b) => a.fromFirst - b.fromFirst), x: mid + half, along: 1, turn: 1 },
    { tiles: board.filter((t) => t.fromFirst < 0).sort((a, b) => b.fromFirst - a.fromFirst), x: mid - half, along: -1, turn: -1 },
  ];
  for (const arm of arms) {
    /** Where the next tile attaches: x on the run, and the run's line. */
    let { x, along } = arm;
    let y = line;
    /** In a corner: the column the drop runs down, and the y where the next tile attaches. */
    let corner: { left: number; at: number; step: 1 | 2 } | null = null;
    for (const t of arm.tiles) {
      // The near number touches the tile before; on the left arm that is the tile's right.
      const [near, far] = arm.turn === 1 ? [t.left, t.right] : [t.right, t.left];
      const double = isDouble(t);
      if (corner === null) {
        // Keep one column free at the edge so there is always room to turn.
        const length = double ? 1 : 2;
        const fits = along === 1 ? x + length <= BOARD_UNITS - 1 : x - length >= 1;
        if (fits) {
          const left = along === 1 ? x : x - length;
          const [first, second] = along === 1 ? [near, far] : [far, near];
          if (double) placed.push({ tile: t.tile, x: left, y: y - 1, w: 1, h: 2, vertical: true, first, second });
          else placed.push({ tile: t.tile, x: left, y: y - 0.5, w: 2, h: 1, vertical: false, first, second });
          x += length * along;
          continue;
        }
        // First corner tile: standing in the column past the run's end.
        const column = along === 1 ? x : x - 1;
        const [first, second] = arm.turn === 1 ? [near, far] : [far, near];
        if (double) {
          // Across the run, centred on its line; the drop leaves from its end.
          placed.push({ tile: t.tile, x: column, y: y - 1, w: 1, h: 2, vertical: true, first, second });
          corner = { left: column, at: arm.turn === 1 ? y + 1 : y - 1, step: 2 };
        } else {
          // Its near half beside the run's last tile.
          const top = arm.turn === 1 ? y - 0.5 : y - 1.5;
          placed.push({ tile: t.tile, x: column, y: top, w: 1, h: 2, vertical: true, first, second });
          corner = { left: column, at: arm.turn === 1 ? y + 1.5 : y - 1.5, step: 2 };
        }
        continue;
      }
      // Second corner tile: continues the drop from the first one's end.
      const { left: column, at } = corner;
      along = -along;
      if (double) {
        // Across the drop, centred on it; the next run leaves from its end.
        const top = arm.turn === 1 ? at : at - 1;
        placed.push({ tile: t.tile, x: column - 0.5, y: top, w: 2, h: 1, vertical: false, first: near, second: far });
        y = top + 0.5;
        x = along === 1 ? column + 1.5 : column - 0.5;
      } else {
        const top = arm.turn === 1 ? at : at - 2;
        const [first, second] = arm.turn === 1 ? [near, far] : [far, near];
        placed.push({ tile: t.tile, x: column, y: top, w: 1, h: 2, vertical: true, first, second });
        // The next run starts beside its far half, going back.
        y = arm.turn === 1 ? top + 1.5 : top + 0.5;
        x = along === 1 ? column + 1 : column;
      }
      corner = null;
    }
  }
  return placed;
}
