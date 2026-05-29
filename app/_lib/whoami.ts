// The `whoami` neofetch-style card fields, owner-editable via `nano whoami`
// and stored in `site.whoami` as a markdown frontmatter block — the same
// `---` / `key: value` style as resume.md, so editing feels like the others.
// Kept here (not in the resume frontmatter parser) so the card stays decoupled
// from /resume; its keys (role/status) differ from the resume schema anyway.

// One row of the card, in file order: a `key: value` pair, or just a value for
// a key-less line (e.g. a tagline). Any key works — add a line in `nano whoami`
// and it shows up — so the card isn't a fixed schema.
export type WhoamiField = { key?: string; value: string };

// Parse the buffer into an ordered list of rows. A line with a colon becomes a
// keyed row — the text before the first colon is the (dim) label, so it can be
// multi-word like "for fun"; a line with no colon becomes a key-less row, e.g.
// a plain tagline. `---` fences, comments, and blanks are skipped. It's taken
// literally — dropping a line hides that row (e.g. clear `status:` to remove
// "open to work") — and empty input yields no rows, since the content lives in
// `site.whoami`.
export function parseWhoami(text: string | null): WhoamiField[] {
  const src = text ?? "";
  const fields: WhoamiField[] = [];
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || /^-{3,}$/.test(line)) continue;
    const colon = line.indexOf(":");
    const label = colon > 0 ? line.slice(0, colon).trim() : "";
    if (label) {
      // `label: value` — skip a blank value so clearing a line hides its row.
      const value = line.slice(colon + 1).trim();
      if (value) fields.push({ key: label.toLowerCase(), value });
    } else {
      // No colon → a key-less line, such as a plain tagline.
      fields.push({ value: line });
    }
  }
  return fields;
}
