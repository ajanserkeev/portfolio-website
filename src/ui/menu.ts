/**
 * Top bar menu: `[data-menu-button]` toggles `[data-menu]`. Escape and a click outside close it;
 * Escape returns focus to the button.
 */
export function initMenu(doc: Document): () => void {
  const button = doc.querySelector<HTMLButtonElement>('[data-menu-button]');
  const menu = doc.querySelector<HTMLElement>('[data-menu]');
  if (!button || !menu) return () => {};

  const setOpen = (open: boolean) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  const isOpen = () => !menu.hidden;

  const onButton = () => setOpen(!isOpen());
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    setOpen(false);
    button.focus();
  };
  const onDocClick = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!isOpen() || !target || button.contains(target) || menu.contains(target)) return;
    setOpen(false);
  };

  button.addEventListener('click', onButton);
  doc.addEventListener('keydown', onKey);
  doc.addEventListener('click', onDocClick);
  return () => {
    button.removeEventListener('click', onButton);
    doc.removeEventListener('keydown', onKey);
    doc.removeEventListener('click', onDocClick);
  };
}
