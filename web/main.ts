import "./vue-flags.ts";
import { createApp } from "vue";
import App from "./App.vue";
import { resume } from "./session.ts";

createApp(App).mount("#app");
resume();
