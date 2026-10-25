import { expect, test } from "bun:test";
import type { BoardTile } from "../../web/api.ts";
import { layOut, type Placed } from "../../web/board.ts";

/**
 * A board grown from a first tile, the right arm from the given tiles in order, then the
 * left arm the same way, each tile joining the last on its side.
 */
function grow(first: [number, number], right: [number, number][], left: [number, number][] = []): BoardTile[] {
  const board: BoardTile[] = [{ tile: `${first[0]}-${first[1]}`, left: first[0], right: first[1], fromFirst: 0 }];
  right.forEach(([a, b], i) => board.push({ tile: `R${i}:${a}-${b}`, left: a, right: b, fromFirst: i + 1 }));
  left.forEach(([a, b], i) => board.push({ tile: `L${i}:${a}-${b}`, left: a, right: b, fromFirst: -(i + 1) }));
  return board;
}

/** n tiles that chain from `start`, with a double wherever `doubles` says. */
function chain(start: number, n: number, doubles: number[] = []): [number, number][] {
  const tiles: [number, number][] = [];
  let end = start;
  for (let i = 0; i < n; i++) {
    const next = doubles.includes(i) ? end : (end + 1) % 7;
    tiles.push([end, next]);
    end = next;
  }
  return tiles;
}

const overlaps = (a: Placed, b: Placed) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Whether two tiles share an edge (touch along some length). */
const touch = (a: Placed, b: Placed) => {
  const xs = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const ys = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return (xs === 0 && ys > 0) || (ys === 0 && xs > 0);
};

function check(board: BoardTile[]) {
  const placed = layOut(board);
  expect(placed).toHaveLength(board.length);
  for (const [i, a] of placed.entries()) {
    for (const b of placed.slice(i + 1)) expect(overlaps(a, b)).toBe(false);
    // A double stands across a flat line, or lies across a standing one.
    const tile = board.find((t) => t.tile === a.tile)!;
    if (tile.left !== tile.right) expect(a.w * a.h).toBe(2);
  }
  // Every tile touches the one before it along the snake.
  for (const sign of [1, -1]) {
    const arm = board.filter((t) => Math.sign(t.fromFirst) === sign).sort((a, b) => Math.abs(a.fromFirst) - Math.abs(b.fromFirst));
    let before = placed.find((p) => p.tile === board[0].tile)!;
    for (const t of arm) {
      const here = placed.find((p) => p.tile === t.tile)!;
      expect(touch(before, here)).toBe(true);
      before = here;
    }
  }
  return placed;
}

test("plain tiles snake without overlapping, on both arms", () => {
  check(grow([6, 5], chain(5, 13), chain(6, 13)));
});

test("a turn takes two standing tiles, leaving a gap between runs", () => {
  const placed = check(grow([6, 5], chain(5, 10)));
  const standing = placed.filter((p) => p.vertical);
  expect(standing).toHaveLength(2);
  expect(standing[1].y).toBe(standing[0].y + 2);
  const flatRows = [...new Set(placed.filter((p) => !p.vertical).map((p) => p.y))].sort();
  expect(flatRows[1] - flatRows[0]).toBe(3);
});

test("doubles lie across the line, centred on it", () => {
  const placed = check(grow([6, 6], chain(6, 6, [2])));
  const first = placed[0];
  expect(first).toMatchObject({ vertical: true, w: 1, h: 2, y: -0.5 });
  const double = placed.find((p) => p.first === p.second && p !== first)!;
  expect(double).toMatchObject({ vertical: true, y: -0.5 });
});

test("a double at either corner keeps the snake going from its end", () => {
  // Find where the first corner falls, then put a double there, and then one place later.
  const plain = layOut(grow([6, 5], chain(5, 10)));
  const cornerIndex = plain.findIndex((p) => p.vertical) - 1;
  for (const at of [cornerIndex, cornerIndex + 1]) {
    for (const left of [false, true]) {
      const tiles = chain(5, 12, [at]);
      const placed = check(left ? grow([5, 6], [], tiles.map(([a, b]) => [b, a])) : grow([6, 5], tiles));
      const double = placed.find((p) => p.first === p.second && p.tile !== placed[0].tile)!;
      // As the first corner tile it stands across the run; as the second it lies across the drop.
      expect(double.vertical).toBe(at === cornerIndex);
    }
  }
});
