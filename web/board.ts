// Where each tile of the board goes on screen. Kept apart from the components so the
// layout can be read (and tested) on its own.
import type { BoardTile } from "./api.ts";

/** How many grid units wide the board is; a domino lying flat takes two units by one. */
export const BOARD_UNITS = 16;

export type Placed = { tile: string; x: number; y: number; vertical: boolean; first: number; second: number };

/**
 * Lays the board out as one continuous snake. The first tile sits in the middle; the right
 * arm grows rightward and, at the edge, turns down and comes back the other way, while the
 * left arm grows leftward and turns up. Each tile shows its numbers in the order they are
 * reached along the snake, so touching halves always match.
 */
export function layOut(board: BoardTile[]): Placed[] {
  const placed: Placed[] = [];
  const center = board.find((t) => t.fromFirst === 0);
  if (center === undefined) return placed;
  const start = BOARD_UNITS / 2 - 1;
  placed.push({ tile: center.tile, x: start, y: 0, vertical: false, first: center.left, second: center.right });
  // The right arm goes away from the first tile in board order, the left arm against it.
  const arms = [
    { tiles: board.filter((t) => t.fromFirst > 0).sort((a, b) => a.fromFirst - b.fromFirst), x: start + 2, along: 1, turn: 1 },
    { tiles: board.filter((t) => t.fromFirst < 0).sort((a, b) => b.fromFirst - a.fromFirst), x: start, along: -1, turn: -1 },
  ];
  for (const arm of arms) {
    let { x, along } = arm;
    let row = 0;
    for (const t of arm.tiles) {
      // The near number touches the tile before; on the left arm that is the tile's right.
      const [near, far] = arm.turn === 1 ? [t.left, t.right] : [t.right, t.left];
      // Keep one column free at each edge so there is always room to turn.
      const fits = along === 1 ? x + 2 <= BOARD_UNITS - 1 : x - 2 >= 1;
      if (fits) {
        const left = along === 1 ? x : x - 2;
        const [first, second] = along === 1 ? [near, far] : [far, near];
        placed.push({ tile: t.tile, x: left, y: row, vertical: false, first, second });
        x += 2 * along;
      } else {
        // Stand the tile up beside the row's last tile, reaching into the next row.
        const left = along === 1 ? x : x - 1;
        const top = arm.turn === 1 ? row : row - 1;
        const [first, second] = arm.turn === 1 ? [near, far] : [far, near];
        placed.push({ tile: t.tile, x: left, y: top, vertical: true, first, second });
        row += arm.turn;
        along = -along;
      }
    }
  }
  return placed;
}
