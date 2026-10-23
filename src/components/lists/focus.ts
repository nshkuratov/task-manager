export const LISTS_HEADER_ID = "lists-header";
export const listLinkId = (listId: string) => `list-link-${listId}`;
export const listActionsId = (listId: string) => `list-actions-${listId}`;
export const listCardSelector = (listId: string) => `[data-list-id="${listId}"]`;

const OPEN_DIALOG = '[role="dialog"], [role="alertdialog"]';
const GIVE_UP_MS = 2000;

function focusHeading() {
  const heading = document.querySelector<HTMLElement>(`#${LISTS_HEADER_ID} h1`);
  if (heading === null) return;
  heading.tabIndex = -1;
  heading.focus();
}

/**
 * Moves focus once a dialog has gone and the RSC refresh has caught up: to `targetId` when that element
 * exists, otherwise to the page's `h1`. It waits until no dialog is open, the `goneSelector` element (a
 * deleted card) has left the DOM, and the target has appeared — or gives up after 2 s and uses the `h1`.
 */
export function focusAfterDialog({ targetId, goneSelector }: { targetId?: string; goneSelector?: string }) {
  const started = performance.now();
  const target = () => (targetId === undefined ? null : document.getElementById(targetId));

  const check = () => {
    const settled =
      document.querySelector(OPEN_DIALOG) === null &&
      (goneSelector === undefined || document.querySelector(goneSelector) === null) &&
      (targetId === undefined || target() !== null);
    if (!settled && performance.now() - started < GIVE_UP_MS) {
      requestAnimationFrame(check);
      return;
    }
    // Radix's FocusScope hands focus back to the opener in a setTimeout(0) after the dialog unmounts; a
    // focus moved before that timeout fires would be taken straight back.
    setTimeout(() => {
      const element = target();
      if (element === null) focusHeading();
      else element.focus();
    }, 0);
  };
  requestAnimationFrame(check);
}
