// One question at a time for the guest, before an action that is hard to undo (such
// as leaving a game, which stops it for everyone). ConfirmDialog.vue shows it.
import { reactive } from "vue";

export const dialog = reactive({
  open: false,
  title: "",
  text: "",
  confirm: "",
  answer: (_: boolean) => {},
});

/** Asks the guest; answers true if they confirm. */
export function confirmAction(question: { title: string; text: string; confirm: string }): Promise<boolean> {
  dialog.answer(false);
  return new Promise((resolve) => {
    Object.assign(dialog, question, {
      open: true,
      answer: (yes: boolean) => {
        dialog.open = false;
        dialog.answer = () => {};
        resolve(yes);
      },
    });
  });
}
