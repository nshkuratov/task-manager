/** `modal` is the `@modal` slot: `/tasks/<id>` opened from this list renders there, over the list. */
export default function ListLayout({ children, modal }: LayoutProps<"/lists/[id]">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
