<script setup lang="ts">
// A domino: two numbers split by a line, lying flat or standing up.
defineProps<{ first: number; second: number; vertical?: boolean }>();
</script>

<template>
  <span class="tile" :class="{ vertical }">
    <span>{{ first }}</span>
    <span>{{ second }}</span>
  </span>
</template>

<style scoped>
.tile {
  display: inline-flex;
  box-sizing: border-box;
  border: 2px solid #222;
  border-radius: 0.4rem;
  background: #fffdf5;
  font: bold 1.1rem ui-monospace, monospace;
}

.tile span {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.5rem;
}

.tile span + span {
  border-left: 2px solid #222;
}

.vertical {
  flex-direction: column;
}

.vertical span + span {
  border-left: none;
  border-top: 2px solid #222;
}
</style>
