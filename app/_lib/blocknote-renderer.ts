// Server-side renderer for BlockNote JSON blocks
// Converts BlockNote block array to HTML string without requiring the editor

interface InlineContent {
  type: string;
  text?: string;
  styles?: Record<string, boolean | string>;
  href?: string;
  content?: InlineContent[];
}

interface Block {
  id?: string;
  type: string;
  props?: Record<string, any>;
  content?: InlineContent[] | { type: string; rows: TableRow[] };
  children?: Block[];
}

interface TableRow {
  cells: TableCell[][];
}

interface TableCell {
  type: string;
  text?: string;
  styles?: Record<string, boolean | string>;
  href?: string;
  content?: TableCell[];
}

function renderInlineContent(content: InlineContent[] | undefined): string {
  if (!content || !Array.isArray(content) || content.length === 0) return "";

  return content
    .map((item) => {
      if (item.type === "link") {
        const inner = renderInlineContent(item.content);
        return `<a href="${escapeHtml(item.href || "")}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
      }

      let text = escapeHtml(item.text || "");

      if (item.styles) {
        if (item.styles.bold) text = `<strong>${text}</strong>`;
        if (item.styles.italic) text = `<em>${text}</em>`;
        if (item.styles.underline) text = `<u>${text}</u>`;
        if (item.styles.strikethrough) text = `<s>${text}</s>`;
        if (item.styles.code) text = `<code>${text}</code>`;
      }

      return text;
    })
    .join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAlignStyle(props?: Record<string, any>): string {
  const align = props?.textAlignment;
  if (!align || align === "left") return "";
  return ` style="text-align:${align}"`;
}

function renderCellContent(cell: any): string {
  // TableCell object: { type: "tableCell", content: InlineContent[] }
  if (cell && typeof cell === "object" && cell.type === "tableCell") {
    return renderInlineContent(cell.content);
  }
  // Plain InlineContent[] array
  if (Array.isArray(cell)) {
    return renderInlineContent(cell);
  }
  // String fallback
  if (typeof cell === "string") {
    return escapeHtml(cell);
  }
  return "";
}

function renderTableContent(content: any): string {
  if (!content || !content.rows) return "";

  const headerRows = content.headerRows || 0;
  const rows = content.rows as any[];

  const rowsHtml = rows
    .map((row: any, rowIndex: number) => {
      const isHeader = rowIndex < headerRows;
      const tag = isHeader ? "th" : "td";
      const cells = (row.cells || [])
        .map((cell: any) => `<${tag}>${renderCellContent(cell)}</${tag}>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<table>${rowsHtml}</table>`;
}

function renderChildren(children: Block[] | undefined): string {
  if (!children || children.length === 0) return "";
  const inner = renderBlocksToHtmlInternal(children);
  return `<div class="bn-nested">${inner}</div>`;
}

function renderBlock(block: Block): string {
  const children = renderChildren(block.children);
  const align = getAlignStyle(block.props);

  switch (block.type) {
    case "paragraph": {
      const inline = renderInlineContent(block.content as InlineContent[]);
      if (!inline) return `<p${align}><br></p>${children}`;
      return `<p${align}>${inline}</p>${children}`;
    }
    case "heading": {
      const inline = renderInlineContent(block.content as InlineContent[]);
      const level = block.props?.level || 1;
      return `<h${level}${align}>${inline}</h${level}>${children}`;
    }
    case "bulletListItem": {
      const inline = renderInlineContent(block.content as InlineContent[]);
      return `<li${align}>${inline}${children}</li>`;
    }
    case "numberedListItem": {
      const inline = renderInlineContent(block.content as InlineContent[]);
      return `<li${align}>${inline}${children}</li>`;
    }
    case "checkListItem": {
      const inline = renderInlineContent(block.content as InlineContent[]);
      const checked = block.props?.checked ? "checked disabled" : "disabled";
      const textClass = block.props?.checked
        ? ' style="text-decoration:line-through;opacity:0.6"'
        : "";
      return `<li class="check-list-item"><input type="checkbox" ${checked} /><span${textClass}>${inline}</span>${children}</li>`;
    }
    case "image": {
      const width = block.props?.previewWidth
        ? `max-width:${block.props.previewWidth}px;`
        : "";
      const imgAlign = block.props?.textAlignment;
      const margin =
        imgAlign === "center"
          ? "margin-left:auto;margin-right:auto;"
          : imgAlign === "right"
          ? "margin-left:auto;"
          : "";
      const figStyle =
        width || margin ? ` style="${width}${margin}"` : "";
      return `<figure${figStyle}><img src="${escapeHtml(block.props?.url || "")}" alt="${escapeHtml(block.props?.caption || "")}" loading="lazy" />${
        block.props?.caption
          ? `<figcaption>${escapeHtml(block.props.caption)}</figcaption>`
          : ""
      }</figure>${children}`;
    }
    case "video": {
      const url = block.props?.url;
      if (!url) return children;
      const width = block.props?.previewWidth
        ? ` style="max-width:${block.props.previewWidth}px"`
        : "";
      return `<figure${width}><video src="${escapeHtml(url)}" controls preload="metadata"></video>${
        block.props?.caption
          ? `<figcaption>${escapeHtml(block.props.caption)}</figcaption>`
          : ""
      }</figure>${children}`;
    }
    case "audio": {
      const url = block.props?.url;
      if (!url) return children;
      return `<figure><audio src="${escapeHtml(url)}" controls preload="metadata"></audio>${
        block.props?.caption
          ? `<figcaption>${escapeHtml(block.props.caption)}</figcaption>`
          : ""
      }</figure>${children}`;
    }
    case "file": {
      const url = block.props?.url;
      const name = block.props?.name || "Download file";
      if (!url) return children;
      return `<p><a href="${escapeHtml(url)}" download>${escapeHtml(name)}</a></p>${children}`;
    }
    case "toggleListItem": {
      const inline = renderInlineContent(block.content as InlineContent[]);
      return `<details><summary>${inline}</summary>${children}</details>`;
    }
    case "divider":
      return `<hr />${children}`;
    case "codeBlock": {
      const inline = renderInlineContent(block.content as InlineContent[]);
      const lang = block.props?.language
        ? ` class="language-${escapeHtml(block.props.language)}"`
        : "";
      return `<pre><code${lang}>${inline}</code></pre>${children}`;
    }
    case "quote": {
      const inline = renderInlineContent(block.content as InlineContent[]);
      return `<blockquote${align}>${inline}</blockquote>${children}`;
    }
    case "table":
      return `${renderTableContent(block.content)}${children}`;
    case "pageBreak":
      return `<div class="page-break"></div>${children}`;
    default: {
      const inline = renderInlineContent(block.content as InlineContent[]);
      return inline ? `<p${align}>${inline}</p>${children}` : children;
    }
  }
}

function renderBlocksToHtmlInternal(blocks: Block[]): string {
  if (!blocks || blocks.length === 0) return "";

  const parts: string[] = [];
  let inBulletList = false;
  let inNumberedList = false;
  let inCheckList = false;

  for (const block of blocks) {
    // Close any open list that doesn't match current block type
    if (block.type !== "bulletListItem" && inBulletList) {
      parts.push("</ul>");
      inBulletList = false;
    }
    if (block.type !== "numberedListItem" && inNumberedList) {
      parts.push("</ol>");
      inNumberedList = false;
    }
    if (block.type !== "checkListItem" && inCheckList) {
      parts.push("</ul>");
      inCheckList = false;
    }

    if (block.type === "bulletListItem") {
      if (!inBulletList) {
        parts.push("<ul>");
        inBulletList = true;
      }
      parts.push(renderBlock(block));
    } else if (block.type === "numberedListItem") {
      if (!inNumberedList) {
        parts.push("<ol>");
        inNumberedList = true;
      }
      parts.push(renderBlock(block));
    } else if (block.type === "checkListItem") {
      if (!inCheckList) {
        parts.push('<ul class="check-list">');
        inCheckList = true;
      }
      parts.push(renderBlock(block));
    } else {
      parts.push(renderBlock(block));
    }
  }

  if (inBulletList) parts.push("</ul>");
  if (inNumberedList) parts.push("</ol>");
  if (inCheckList) parts.push("</ul>");

  return parts.join("");
}

export function renderBlocksToHtml(blocks: Block[]): string {
  return renderBlocksToHtmlInternal(blocks);
}
