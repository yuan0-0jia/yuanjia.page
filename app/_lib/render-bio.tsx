export function renderBio(text: string): (string | React.ReactElement)[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      const href = /^https?:\/\//.test(m[2]) ? m[2] : `https://${m[2]}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline", textDecorationColor: "var(--accent)", color: "inherit" }}
        >
          {m[1]}
        </a>
      );
    }
    return part;
  });
}
