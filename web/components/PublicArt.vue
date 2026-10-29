<script setup lang="ts">
// Playing with strangers from anywhere: a globe with players dotted around it, over a
// table with a game of dominoes laid out. Drawn for DOMINAO; decorative only.
</script>

<template>
  <svg class="art" viewBox="0 0 360 240" role="img" aria-label="A globe with players around it, above a table of dominoes">
    <defs>
      <radialGradient id="pub-sea" cx="38%" cy="32%" r="75%">
        <stop offset="0" stop-color="#e6f1f7" />
        <stop offset="0.55" stop-color="#a9cfe2" />
        <stop offset="1" stop-color="#6fa6c2" />
      </radialGradient>
      <radialGradient id="pub-glow" cx="50%" cy="45%" r="50%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.35" />
        <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="pub-felt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#bf4f4a" />
        <stop offset="1" stop-color="#8c2a2c" />
      </linearGradient>
      <clipPath id="pub-globe"><circle cx="180" cy="100" r="84" /></clipPath>
      <g id="pub-tile">
        <rect x="-9" y="-5" width="18" height="10" rx="2" fill="#fbf7f2" stroke="#2a1f1f" stroke-opacity="0.25" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#2a1f1f" stroke-opacity="0.35" stroke-width="0.8" />
      </g>
    </defs>

    <circle cx="180" cy="100" r="118" fill="url(#pub-glow)" />

    <!-- The globe, with its meridians and parallels. -->
    <circle cx="180" cy="100" r="84" fill="url(#pub-sea)" />
    <g clip-path="url(#pub-globe)">
      <path
        d="M118 58c14-10 34-14 46-6 8 6 2 14-6 18-10 4-10 14-2 20 10 8 4 22-10 22-12 0-20-10-30-12-12-2-16-14-10-24 4-8 6-14 12-18z"
        fill="#fbf7f2"
        opacity="0.75"
      />
      <path d="M196 40c18-6 40 0 50 12 6 8-2 14-12 14-8 0-12 8-6 14 8 8 2 18-10 16-10-2-14-12-22-16-10-4-14-14-8-24 2-6 4-12 8-16z" fill="#fbf7f2" opacity="0.75" />
      <path d="M206 118c12-4 26 2 30 12 4 12-6 26-18 30-10 2-14-8-14-18 0-8-8-12-6-18 2-4 4-6 8-6z" fill="#fbf7f2" opacity="0.75" />
      <path d="M140 132c8-2 16 4 16 12s-8 16-16 16-12-8-10-16c2-6 4-10 10-12z" fill="#fbf7f2" opacity="0.6" />
      <g fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.2">
        <ellipse cx="180" cy="100" rx="28" ry="84" />
        <ellipse cx="180" cy="100" rx="58" ry="84" />
        <line x1="180" y1="16" x2="180" y2="184" />
        <path d="M96 100h168M104 62h152M104 138h152" />
      </g>
    </g>
    <circle cx="180" cy="100" r="84" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2" />

    <!-- Routes between players on the globe. -->
    <g fill="none" stroke="#bf4f4a" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round">
      <path d="M138 78q36-40 82-22" />
      <path d="M222 58q40 40 0 82" />
      <path d="M146 142q30 28 72-4" />
    </g>
    <!-- Pins where players are. -->
    <g>
      <g transform="translate(138 78)"><path d="M0 0c-6-7-8-10-8-14a8 8 0 0 1 16 0c0 4-2 7-8 14z" fill="#a83a38" /><circle cy="-14" r="3" fill="#fbf7f2" /></g>
      <g transform="translate(222 58)"><path d="M0 0c-6-7-8-10-8-14a8 8 0 0 1 16 0c0 4-2 7-8 14z" fill="#a83a38" /><circle cy="-14" r="3" fill="#fbf7f2" /></g>
      <g transform="translate(222 140)"><path d="M0 0c-6-7-8-10-8-14a8 8 0 0 1 16 0c0 4-2 7-8 14z" fill="#a83a38" /><circle cy="-14" r="3" fill="#fbf7f2" /></g>
      <g transform="translate(146 142)"><path d="M0 0c-6-7-8-10-8-14a8 8 0 0 1 16 0c0 4-2 7-8 14z" fill="#a83a38" /><circle cy="-14" r="3" fill="#fbf7f2" /></g>
    </g>

    <!-- An orbit of players. -->
    <ellipse cx="180" cy="100" rx="150" ry="40" fill="none" stroke="#6fa6c2" stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="2 6" transform="rotate(-12 180 100)" />
    <g stroke="#fbf7f2" stroke-width="3">
      <circle cx="44" cy="124" r="13" fill="#e0a43a" />
      <circle cx="318" cy="66" r="13" fill="#5c8fb0" />
      <circle cx="300" cy="140" r="10" fill="#6b8f5a" />
      <circle cx="62" cy="62" r="10" fill="#8a5a9a" />
    </g>
    <g fill="#fbf7f2" opacity="0.95">
      <circle cx="44" cy="120" r="4" /><path d="M36 131a8 6 0 0 1 16 0z" />
      <circle cx="318" cy="62" r="4" /><path d="M310 73a8 6 0 0 1 16 0z" />
      <circle cx="300" cy="137" r="3" /><path d="M294 146a6 5 0 0 1 12 0z" />
      <circle cx="62" cy="59" r="3" /><path d="M56 68a6 5 0 0 1 12 0z" />
    </g>

    <!-- The table, with a game going on. -->
    <ellipse cx="180" cy="222" rx="132" ry="14" fill="#2a0c0d" opacity="0.35" />
    <ellipse cx="180" cy="200" rx="128" ry="34" fill="#5a2a1c" />
    <ellipse cx="180" cy="196" rx="128" ry="32" fill="#7a3a26" />
    <ellipse cx="180" cy="195" rx="114" ry="26" fill="url(#pub-felt)" />
    <g>
      <use href="#pub-tile" transform="translate(122 196)" />
      <use href="#pub-tile" transform="translate(141 196)" />
      <use href="#pub-tile" transform="translate(160 196)" />
      <use href="#pub-tile" transform="translate(180 196) rotate(90)" />
      <use href="#pub-tile" transform="translate(200 196)" />
      <use href="#pub-tile" transform="translate(219 196)" />
      <use href="#pub-tile" transform="translate(238 196)" />
      <g fill="#2a1f1f">
        <circle cx="117" cy="196" r="1.3" /><circle cx="126" cy="194" r="1.3" /><circle cx="126" cy="198" r="1.3" />
        <circle cx="145" cy="194" r="1.3" /><circle cx="145" cy="198" r="1.3" /><circle cx="136" cy="196" r="1.3" />
        <circle cx="155" cy="196" r="1.3" /><circle cx="164" cy="194" r="1.3" /><circle cx="164" cy="196" r="1.3" /><circle cx="164" cy="198" r="1.3" />
        <circle cx="178" cy="190" r="1.3" /><circle cx="182" cy="190" r="1.3" /><circle cx="178" cy="202" r="1.3" /><circle cx="182" cy="202" r="1.3" /><circle cx="180" cy="196" r="1.3" />
        <circle cx="196" cy="194" r="1.3" /><circle cx="196" cy="198" r="1.3" /><circle cx="204" cy="196" r="1.3" />
        <circle cx="214" cy="196" r="1.3" /><circle cx="223" cy="194" r="1.3" /><circle cx="223" cy="198" r="1.3" />
        <circle cx="242" cy="196" r="1.3" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.art {
  display: block;
  width: 100%;
  height: auto;
}
</style>
