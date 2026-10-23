// Stripping every combining mark also folds letters such as Cyrillic й → и; accepted for accent-insensitivity.
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFKC").toLocaleLowerCase("und");
}

/**
 * Case- and diacritic-insensitive substring match of `query` (trimmed) in `name`. A blank or whitespace-only query
 * matches every name.
 */
export function matchesListQuery(name: string, query: string): boolean {
  const trimmed = query.trim();
  if (trimmed === "") return true;
  return fold(name).includes(fold(trimmed));
}
