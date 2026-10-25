import { expect, test } from "bun:test";
import type { BoardTile } from "../../web/api.ts";
import { BOARD_UNITS, layOut } from "../../web/board.ts";

/** A right arm of `count` tiles after a 6-6, each joining the last. */
function rightArm(count: number): BoardTile[] {
  const board: BoardTile[] = [{ tile: "6-6", left: 6, right: 6, fromFirst: 0 }];
  let end = 6;
  for (let i = 1; i <= count; i++) {
    const next = (end + 1) % 7;
    board.push({ tile: `${end}-${next}-${i}`, left: end, right: next, fromFirst: i });
    end = next;
  }
  return board;
}

const cells = (p: ReturnType<typeof layOut>[number]) => {
  const result: string[] = [];
  for (let dx = 0; dx < (p.vertical ? 1 : 2); dx++)
    for (let dy = 0; dy < (p.vertical ? 2 : 1); dy++) result.push(`${p.x + dx},${p.y + dy}`);
  return result;
};

test("tiles never overlap and stay on the board, on both arms", () => {
  const board = rightArm(13);
  // Mirror the right arm onto the left one, against board order.
  for (const t of board.slice(1)) board.push({ ...t, tile: `L${t.tile}`, fromFirst: -t.fromFirst, left: t.right, right: t.left });
  const placed = layOut(board);
  expect(placed).toHaveLength(board.length);
  const seen = new Set<string>();
  for (const p of placed) {
    for (const cell of cells(p)) {
      expect(seen.has(cell)).toBe(false);
      seen.add(cell);
    }
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x + (p.vertical ? 1 : 2)).toBeLessThanOrEqual(BOARD_UNITS);
  }
});

test("a turn takes two standing tiles, leaving an empty row between runs", () => {
  const placed = layOut(rightArm(10));
  const standing = placed.filter((p) => p.vertical);
  expect(standing).toHaveLength(2);
  expect(standing[1].y).toBe(standing[0].y + 2);
  expect(standing[1].x).toBe(standing[0].x);
  const flatRows = new Set(placed.filter((p) => !p.vertical).map((p) => p.y));
  expect([...flatRows].sort()).toEqual([0, 3]);
});
