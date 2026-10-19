// Vue's bundler build expects these compile-time flags; without a bundler that injects
// them, setting them before Vue loads keeps the console free of its warning.
Object.assign(globalThis, {
  __VUE_OPTIONS_API__: true,
  __VUE_PROD_DEVTOOLS__: false,
  __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
});
