import Image from "next/image";
import { Fragment, type ReactNode } from "react";

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
  content?: InlineContent[] | any;
  children?: Block[];
}

function renderInline(content: InlineContent[] | undefined): ReactNode {
  if (!content || !Array.isArray(content) || content.length === 0) return null;

  return content.map((item, i) => {
    if (item.type === "link") {
      return (
        <a
          key={i}
          href={item.href || ""}
          target="_blank"
          rel="noopener noreferrer"
        >
          {renderInline(item.content)}
        </a>
      );
    }

    let node: ReactNode = item.text || "";

    if (item.styles) {
      if (item.styles.code) node = <code key={`c${i}`}>{node}</code>;
      if (item.styles.bold) node = <strong key={`b${i}`}>{node}</strong>;
      if (item.styles.italic) node = <em key={`i${i}`}>{node}</em>;
      if (item.styles.underline) node = <u key={`u${i}`}>{node}</u>;
      if (item.styles.strikethrough) node = <s key={`s${i}`}>{node}</s>;
    }

    return <Fragment key={i}>{node}</Fragment>;
  });
}

function getAlignStyle(
  props?: Record<string, any>
): React.CSSProperties | undefined {
  const align = props?.textAlignment;
  if (!align || align === "left") return undefined;
  return { textAlign: align };
}

function renderCellContent(cell: any): ReactNode {
  if (cell && typeof cell === "object" && cell.type === "tableCell") {
    return renderInline(cell.content);
  }
  if (Array.isArray(cell)) {
    return renderInline(cell);
  }
  if (typeof cell === "string") {
    return cell;
  }
  return null;
}

function RenderChildren({ children }: { children?: Block[] }) {
  if (!children || children.length === 0) return null;
  return (
    <div className="bn-nested">
      <RenderBlocks blocks={children} />
    </div>
  );
}

function RenderBlock({ block }: { block: Block }) {
  const children = block.children;
  const align = getAlignStyle(block.props);

  switch (block.type) {
    case "paragraph": {
      const inline = renderInline(block.content as InlineContent[]);
      return (
        <>
          <p style={align}>{inline || <br />}</p>
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
    case "heading": {
      const inline = renderInline(block.content as InlineContent[]);
      const Tag = `h${block.props?.level || 1}` as "h1" | "h2" | "h3";
      return (
        <>
          <Tag style={align}>{inline}</Tag>
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
    case "bulletListItem": {
      const inline = renderInline(block.content as InlineContent[]);
      return (
        <li style={align}>
          {inline}
          <RenderChildren>{children}</RenderChildren>
        </li>
      );
    }
    case "numberedListItem": {
      const inline = renderInline(block.content as InlineContent[]);
      return (
        <li style={align}>
          {inline}
          <RenderChildren>{children}</RenderChildren>
        </li>
      );
    }
    case "checkListItem": {
      const inline = renderInline(block.content as InlineContent[]);
      const checked = !!block.props?.checked;
      return (
        <li className="check-list-item">
          <input type="checkbox" checked={checked} disabled readOnly />
          <span
            style={
              checked
                ? { textDecoration: "line-through", opacity: 0.6 }
                : undefined
            }
          >
            {inline}
          </span>
          <RenderChildren>{children}</RenderChildren>
        </li>
      );
    }
    case "image": {
      const url = block.props?.url;
      if (!url) return <RenderChildren>{children}</RenderChildren>;

      const previewWidth = block.props?.previewWidth || 800;
      const caption = block.props?.caption;
      const imgAlign = block.props?.textAlignment;
      const margin =
        imgAlign === "center"
          ? "auto"
          : imgAlign === "right"
          ? "0 0 0 auto"
          : undefined;

      const isSupabase = url.includes("supabase.co");

      return (
        <>
          <figure style={{ maxWidth: `${previewWidth}px`, margin }}>
            {isSupabase ? (
              <Image
                src={url}
                alt={caption || ""}
                width={previewWidth}
                height={Math.round(previewWidth * 0.667)}
                sizes={`(max-width: ${previewWidth}px) 100vw, ${previewWidth}px`}
                className="about-img"
                style={{ width: "100%", height: "auto" }}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjUzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVlZmUzIi8+PC9zdmc+"
              />
            ) : (
              // External images can't use Next.js Image without adding their domain
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={caption || ""}
                width={previewWidth}
                loading="lazy"
              />
            )}
            {caption && <figcaption>{caption}</figcaption>}
          </figure>
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
    case "video": {
      const url = block.props?.url;
      if (!url) return <RenderChildren>{children}</RenderChildren>;
      const previewWidth = block.props?.previewWidth;
      return (
        <>
          <figure style={previewWidth ? { maxWidth: `${previewWidth}px` } : undefined}>
            <video src={url} controls preload="metadata" />
            {block.props?.caption && (
              <figcaption>{block.props.caption}</figcaption>
            )}
          </figure>
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
    case "audio": {
      const url = block.props?.url;
      if (!url) return <RenderChildren>{children}</RenderChildren>;
      return (
        <>
          <figure>
            <audio src={url} controls preload="metadata" />
            {block.props?.caption && (
              <figcaption>{block.props.caption}</figcaption>
            )}
          </figure>
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
    case "file": {
      const url = block.props?.url;
      const name = block.props?.name || "Download file";
      if (!url) return <RenderChildren>{children}</RenderChildren>;
      return (
        <>
          <p>
            <a href={url} download>
              {name}
            </a>
          </p>
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
    case "toggleListItem": {
      const inline = renderInline(block.content as InlineContent[]);
      return (
        <details>
          <summary>{inline}</summary>
          <RenderChildren>{children}</RenderChildren>
        </details>
      );
    }
    case "divider":
      return (
        <>
          <hr />
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    case "codeBlock": {
      const inline = renderInline(block.content as InlineContent[]);
      const lang = block.props?.language;
      return (
        <>
          <pre>
            <code className={lang ? `language-${lang}` : undefined}>
              {inline}
            </code>
          </pre>
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
    case "quote": {
      const inline = renderInline(block.content as InlineContent[]);
      return (
        <>
          <blockquote style={align}>{inline}</blockquote>
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
    case "table": {
      const content = block.content as any;
      if (!content?.rows) return <RenderChildren>{children}</RenderChildren>;
      const headerRows = content.headerRows || 0;
      return (
        <>
          <table>
            <tbody>
              {content.rows.map((row: any, rowIndex: number) => {
                const Tag = rowIndex < headerRows ? "th" : "td";
                return (
                  <tr key={rowIndex}>
                    {(row.cells || []).map((cell: any, cellIndex: number) => (
                      <Tag key={cellIndex}>{renderCellContent(cell)}</Tag>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
    case "pageBreak":
      return (
        <>
          <div className="page-break" />
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    default: {
      const inline = renderInline(block.content as InlineContent[]);
      return (
        <>
          {inline && <p style={align}>{inline}</p>}
          <RenderChildren>{children}</RenderChildren>
        </>
      );
    }
  }
}

function RenderBlocks({ blocks }: { blocks: Block[] }) {
  if (!blocks || blocks.length === 0) return null;

  const elements: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let listType: "ul" | "ol" | "check" | null = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    if (listType === "ol") {
      elements.push(<ol key={`list-${elements.length}`}>{listItems}</ol>);
    } else if (listType === "check") {
      elements.push(
        <ul key={`list-${elements.length}`} className="check-list">
          {listItems}
        </ul>
      );
    } else {
      elements.push(<ul key={`list-${elements.length}`}>{listItems}</ul>);
    }
    listItems = [];
    listType = null;
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockListType =
      block.type === "bulletListItem"
        ? "ul"
        : block.type === "numberedListItem"
        ? "ol"
        : block.type === "checkListItem"
        ? "check"
        : null;

    if (blockListType) {
      if (listType && listType !== blockListType) {
        flushList();
      }
      listType = blockListType;
      listItems.push(
        <RenderBlock key={block.id || `b${i}`} block={block} />
      );
    } else {
      flushList();
      elements.push(
        <RenderBlock key={block.id || `b${i}`} block={block} />
      );
    }
  }

  flushList();
  return <>{elements}</>;
}

export default function AboutContent({ blocks }: { blocks: unknown }) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-typewriter text-sepia-500 dark:text-sepia-400 tracking-wider">
          No content yet.
        </p>
      </div>
    );
  }

  return (
    <div className="about-content font-typewriter tracking-wide leading-loose">
      <RenderBlocks blocks={blocks as Block[]} />
    </div>
  );
}
