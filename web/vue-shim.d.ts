// Lets TypeScript accept imports of single-file components; Bun's Vue plugin compiles them.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent;
  export default component;
}
