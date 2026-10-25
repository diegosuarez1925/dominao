// A number that counts up (or down) to its target instead of jumping, for scores.
import { onBeforeUnmount, ref, watch, type Ref } from "vue";

export function useCountUp(target: () => number, durationMs = 900): Ref<number> {
  const shown = ref(target());
  let frame = 0;
  watch(target, (to) => {
    cancelAnimationFrame(frame);
    const from = shown.value;
    if (from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.value = to;
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Ease out: quick at first, settling at the end.
      shown.value = Math.round(from + (to - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  });
  onBeforeUnmount(() => cancelAnimationFrame(frame));
  return shown;
}
