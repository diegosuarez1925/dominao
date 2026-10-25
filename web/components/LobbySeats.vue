<script setup lang="ts">
// The four places of a lobby, shared by private tables and matchmaking so both
// waiting rooms look the same.
defineProps<{ seats: ({ name: string; tags: string[] } | null)[] }>();
</script>

<template>
  <ol class="seats" start="0">
    <li v-for="(seat, index) in seats" :key="index" :class="{ empty: !seat }">
      <template v-if="seat">
        {{ seat.name }}<template v-for="tag in seat.tags" :key="tag"> ({{ tag }})</template>
      </template>
      <template v-else>(empty)</template>
    </li>
  </ol>
</template>

<style scoped>
.empty {
  color: #777;
}
</style>
