<script setup lang="ts">
// Playing with your own people: four friends around one table under a lamp, with the
// table's code on a card. Drawn for DOMINAO; decorative only.
</script>

<template>
  <svg class="art" viewBox="0 0 360 240" role="img" aria-label="Four friends playing dominoes around a table under a lamp">
    <defs>
      <radialGradient id="priv-light" cx="50%" cy="20%" r="70%">
        <stop offset="0" stop-color="#ffe7a8" stop-opacity="0.95" />
        <stop offset="1" stop-color="#ffe7a8" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="priv-felt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#bf4f4a" />
        <stop offset="1" stop-color="#8c2a2c" />
      </linearGradient>
      <linearGradient id="priv-cone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe7a8" stop-opacity="0.75" />
        <stop offset="1" stop-color="#ffe7a8" stop-opacity="0.05" />
      </linearGradient>
      <g id="priv-tile">
        <rect x="-9" y="-5" width="18" height="10" rx="2" fill="#fbf7f2" stroke="#2a1f1f" stroke-opacity="0.25" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#2a1f1f" stroke-opacity="0.35" stroke-width="0.8" />
      </g>
    </defs>

    <!-- A warm glow, and a string of little lights across the top. -->
    <ellipse cx="180" cy="120" rx="170" ry="120" fill="url(#priv-light)" />
    <path d="M10 22q85 34 170 4t170 4" fill="none" stroke="#6d5c5b" stroke-width="1.2" />
    <g>
      <circle cx="40" cy="31" r="4" fill="#e0a43a" /><circle cx="80" cy="38" r="4" fill="#a9cfe2" />
      <circle cx="120" cy="36" r="4" fill="#bf4f4a" /><circle cx="240" cy="22" r="4" fill="#a9cfe2" />
      <circle cx="280" cy="22" r="4" fill="#e0a43a" /><circle cx="320" cy="26" r="4" fill="#bf4f4a" />
    </g>

    <!-- The lamp over the table. -->
    <line x1="180" y1="0" x2="180" y2="44" stroke="#2a1f1f" stroke-width="2" />
    <path d="M128 168L162 62h36l34 106z" fill="url(#priv-cone)" />
    <path d="M156 64q24-26 48 0z" fill="#a83a38" />
    <rect x="154" y="62" width="52" height="5" rx="2.5" fill="#8c2a2c" />
    <circle cx="180" cy="69" r="4" fill="#fff6d6" />

    <!-- Friends at the back of the table. -->
    <g>
      <circle cx="132" cy="122" r="14" fill="#c98b5e" />
      <path d="M118 118a14 14 0 0 1 28 0c-4-6-10-9-14-9s-10 3-14 9z" fill="#2a1f1f" />
      <path d="M110 160a22 20 0 0 1 44 0z" fill="#5c8fb0" />
      <path d="M126 126q6 5 12 0" fill="none" stroke="#2a1f1f" stroke-width="1.5" stroke-linecap="round" />
      <circle cx="227" cy="122" r="14" fill="#e3b48c" />
      <path d="M213 122c0-12 6-16 14-16s14 4 14 16c-2-6-4-8-6-8-6 0-12 0-22 8z" fill="#7a3a26" />
      <circle cx="241" cy="112" r="5" fill="#7a3a26" />
      <path d="M205 160a22 20 0 0 1 44 0z" fill="#e0a43a" />
      <path d="M221 126q6 5 12 0" fill="none" stroke="#2a1f1f" stroke-width="1.5" stroke-linecap="round" />
    </g>

    <!-- The table, with a game going on. -->
    <ellipse cx="180" cy="224" rx="124" ry="12" fill="#2a0c0d" opacity="0.3" />
    <ellipse cx="180" cy="196" rx="120" ry="36" fill="#5a2a1c" />
    <ellipse cx="180" cy="191" rx="120" ry="33" fill="#7a3a26" />
    <ellipse cx="180" cy="189" rx="106" ry="26" fill="url(#priv-felt)" />
    <g>
      <use href="#priv-tile" transform="translate(142 188)" />
      <use href="#priv-tile" transform="translate(161 188)" />
      <use href="#priv-tile" transform="translate(180 188) rotate(90)" />
      <use href="#priv-tile" transform="translate(199 188)" />
      <use href="#priv-tile" transform="translate(218 188)" />
      <g fill="#2a1f1f">
        <circle cx="137" cy="188" r="1.3" /><circle cx="146" cy="186" r="1.3" /><circle cx="146" cy="190" r="1.3" />
        <circle cx="156" cy="186" r="1.3" /><circle cx="156" cy="190" r="1.3" /><circle cx="165" cy="188" r="1.3" />
        <circle cx="178" cy="182" r="1.3" /><circle cx="182" cy="182" r="1.3" /><circle cx="178" cy="194" r="1.3" /><circle cx="182" cy="194" r="1.3" />
        <circle cx="195" cy="186" r="1.3" /><circle cx="195" cy="190" r="1.3" /><circle cx="203" cy="188" r="1.3" />
        <circle cx="214" cy="188" r="1.3" /><circle cx="222" cy="186" r="1.3" /><circle cx="222" cy="190" r="1.3" />
      </g>
    </g>

    <!-- Friends at the front, seen from behind, each holding their tiles. -->
    <g>
      <path d="M46 240a32 30 0 0 1 64 0z" fill="#6b8f5a" />
      <circle cx="60" cy="198" r="4" fill="#a8704a" /><circle cx="96" cy="198" r="4" fill="#a8704a" />
      <circle cx="78" cy="196" r="18" fill="#2a1f1f" />
      <g transform="translate(104 196) rotate(-18)">
        <rect x="-4" y="-12" width="8" height="15" rx="1.5" fill="#fbf7f2" stroke="#2a1f1f" stroke-opacity="0.3" />
        <rect x="5" y="-11" width="8" height="15" rx="1.5" fill="#fbf7f2" stroke="#2a1f1f" stroke-opacity="0.3" />
      </g>
      <path d="M250 240a32 30 0 0 1 64 0z" fill="#8a5a9a" />
      <circle cx="264" cy="198" r="4" fill="#e3b48c" /><circle cx="300" cy="198" r="4" fill="#e3b48c" />
      <circle cx="282" cy="196" r="18" fill="#c9a24a" />
      <path d="M270 210q12 10 24 0v14h-24z" fill="#c9a24a" />
      <g transform="translate(256 196) rotate(18)">
        <rect x="-4" y="-12" width="8" height="15" rx="1.5" fill="#fbf7f2" stroke="#2a1f1f" stroke-opacity="0.3" />
        <rect x="-13" y="-11" width="8" height="15" rx="1.5" fill="#fbf7f2" stroke="#2a1f1f" stroke-opacity="0.3" />
      </g>
    </g>

    <!-- A heart between friends, and the table's code. -->
    <g transform="translate(286 92)">
      <path d="M-30 -18h52a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8h-36l-10 9v-9h-6a8 8 0 0 1-8-8v-20a8 8 0 0 1 8-8z" fill="#fbf7f2" stroke="#a9cfe2" stroke-width="2" />
      <text x="-4" y="5" text-anchor="middle" font-family="ui-monospace, monospace" font-weight="700" font-size="12" letter-spacing="1.5" fill="#a83a38">ABC123</text>
    </g>
    <path d="M70 92c-6-8-18-4-14 6 2 5 14 12 14 12s12-7 14-12c4-10-8-14-14-6z" fill="#bf4f4a" />
  </svg>
</template>

<style scoped>
.art {
  display: block;
  width: 100%;
  height: auto;
}
</style>
