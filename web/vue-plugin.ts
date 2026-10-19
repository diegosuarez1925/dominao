// Teaches Bun's bundler to load Vue single-file components (.vue), so the page can keep
// being bundled by `bun web/server.ts` with no separate build tool.
import type { BunPlugin } from "bun";
import { compileScript, compileStyle, parse, rewriteDefault } from "vue/compiler-sfc";

/** A short, stable id per file, used to scope a component's styles. */
function idOf(path: string) {
  return Bun.hash(path).toString(16).slice(0, 8);
}

const vue: BunPlugin = {
  name: "vue",
  setup(build) {
    build.onLoad({ filter: /\.vue$/ }, async ({ path }) => {
      const { descriptor, errors } = parse(await Bun.file(path).text(), { filename: path });
      if (errors.length > 0) throw errors[0];
      const id = idOf(path);
      const scoped = descriptor.styles.some((style) => style.scoped);
      // <script setup> with the template compiled into the same module.
      const script = compileScript(descriptor, { id, inlineTemplate: true });
      let code = rewriteDefault(script.content, "__component", ["typescript"]);
      if (scoped) code += `\n__component.__scopeId = "data-v-${id}";`;
      for (const style of descriptor.styles) {
        const css = compileStyle({ source: style.content, filename: path, id: `data-v-${id}`, scoped: style.scoped });
        if (css.errors.length > 0) throw css.errors[0];
        code += `\ndocument.head.append(Object.assign(document.createElement("style"), { textContent: ${JSON.stringify(css.code)} }));`;
      }
      code += "\nexport default __component;";
      return { contents: code, loader: script.lang === "ts" ? "ts" : "js" };
    });
  },
};

export default vue;
