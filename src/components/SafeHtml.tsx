import React from 'react';
import katex from 'katex';
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  content?: string;
  className?: string;
  as?: React.ElementType;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Blocks the script-executing pseudo-protocols; everything else (http(s), mailto, tel, relative paths, bare domains) passes through unchanged. */
function isSafeLinkUrl(url: string): boolean {
  return !/^\s*(javascript|data|vbscript):/i.test(url);
}

// Ensure all links open in a new tab with noopener/noreferrer
if (typeof DOMPurify?.addHook === 'function') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

// No `_`/`*`/backtick/bracket in this token, so the markdown regexes below
// (which key off exactly those characters) can never match into it and
// corrupt it before the final substitution pass restores the real KaTeX
// markup.
const MATH_TOKEN_RE = / KATEXMATH(\d+) /g;
const mathToken = (index: number) => ` KATEXMATH${index} `;

export function parseMarkdownToHtml(text: string): string {
  if (!text) return '';

  // Math is rendered up front, against the raw source — KaTeX needs real
  // `<`/`>`/`&`, not HTML entities — and its output, which is trusted HTML,
  // is stashed behind a placeholder.
  const mathReplacements: string[] = [];
  const stashMath = (html: string) => {
    const token = mathToken(mathReplacements.length);
    mathReplacements.push(html);
    return token;
  };

  let working = text;

  working = working.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return stashMath(katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }));
    } catch {
      return stashMath(escapeHtml(math));
    }
  });

  working = working.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    try {
      return stashMath(katex.renderToString(math.trim(), { displayMode: false, throwOnError: false }));
    } catch {
      return stashMath(escapeHtml(math));
    }
  });

  // Stash valid HTML tags and comments so Markdown regexes (like * or _) do not
  // mangle tag attributes or URLs (e.g. href="https://..._...").
  const htmlTagReplacements: string[] = [];
  const HTML_TAG_RE = /<(?:\/?[a-zA-Z][a-zA-Z0-9:-]*)(?:\s+(?:[a-zA-Z0-9:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^'"\s>]+))?))*\s*\/?>|<!--[\s\S]*?-->/g;
  working = working.replace(HTML_TAG_RE, (tag) => {
    const token = `%%%TRSCHTMLTAG${htmlTagReplacements.length}%%%`;
    htmlTagReplacements.push(tag);
    return token;
  });

  // Escape raw < and > that are not part of HTML tags (e.g. 5 < 10)
  // and & that are not part of existing HTML entities (&nbsp;, &copy;, etc.)
  let html = working
    .replace(/&(?!([a-zA-Z0-9#]+;))/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text** or __text__
  html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Italics: *text* or _text_
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // Inline code: `text`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    if (!isSafeLinkUrl(url)) return linkText;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#4C9A3A] dark:text-[#6CC24A] underline hover:text-[#1F3A42]">${linkText}</a>`;
  });

  // Auto-link bare URLs (http:// or https://) not already inside tags
  html = html.replace(/(^|[\s(])(https?:\/\/[^\s<)"]+)/g, (match, prefix, rawUrl) => {
    const cleanUrl = rawUrl.replace(/[.,!?:)]+$/, '');
    const trailing = rawUrl.slice(cleanUrl.length);
    if (!isSafeLinkUrl(cleanUrl)) return match;
    return `${prefix}<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-[#4C9A3A] dark:text-[#6CC24A] underline hover:text-[#1F3A42]">${cleanUrl}</a>${trailing}`;
  });

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="font-bold text-base my-1">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg my-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl my-1">$1</h1>');

  // Bullet lists: lines starting with "- " or "* "
  const lines = html.split('\n');
  let inList = false;
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^[\s]*[-*]\s+(.*)/);
    if (match) {
      if (!inList) {
        inList = true;
        processedLines.push('<ul class="list-disc ml-4 space-y-0.5">');
      }
      processedLines.push(`<li>${match[1]}</li>`);
    } else {
      if (inList) {
        inList = false;
        processedLines.push('</ul>');
      }
      processedLines.push(line);
    }
  }
  if (inList) {
    processedLines.push('</ul>');
  }

  html = processedLines.join('\n');

  // If the text is primarily an HTML snippet with block elements, avoid converting single \n to <br />
  // as it ruins table structures, grid containers, and flex layouts.
  const hasBlockHtml = /<(?:div|table|section|article|tbody|tr|td|thead|ul|ol|header|footer)\b/i.test(working);
  if (!hasBlockHtml) {
    html = html.replace(/\n\n/g, '<br /><br />').replace(/\n/g, '<br />');
  }

  // Swap HTML tags back in
  html = html.replace(/%%%TRSCHTMLTAG(\d+)%%%/g, (_, index) => htmlTagReplacements[Number(index)] ?? '');

  // Clean up unwanted <br /> tags around block-level HTML tags so tables, divs, headings, and lists
  // do not get broken or double-spaced by line breaks in raw HTML input.
  const BLOCK_TAGS = 'address|article|aside|blockquote|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tfoot|thead|tbody|tr|th|td|ul';
  html = html.replace(new RegExp(`(<(?:${BLOCK_TAGS})\\b[^>]*>)(?:\\s*<br\\s*\\/?>)+`, 'gi'), '$1');
  html = html.replace(new RegExp(`(?:<br\\s*\\/?>\\s*)+(<\\/(?:${BLOCK_TAGS})>)`, 'gi'), '$1');
  html = html.replace(new RegExp(`(<\\/(?:${BLOCK_TAGS})>)(?:\\s*<br\\s*\\/?>)+`, 'gi'), '$1');
  html = html.replace(new RegExp(`(?:<br\\s*\\/?>\\s*)+(<(?:${BLOCK_TAGS})\\b[^>]*>)`, 'gi'), '$1');

  // Sanitize the HTML to strip dangerous scripts, event handlers, and invalid tags
  if (typeof DOMPurify?.sanitize === 'function') {
    html = DOMPurify.sanitize(html, {
      ADD_ATTR: ['target', 'rel', 'style', 'class', 'colspan', 'rowspan', 'width', 'align', 'cellpadding', 'cellspacing'],
    });
  }

  // Swap the math placeholders back in for KaTeX's real (trusted) markup.
  html = html.replace(MATH_TOKEN_RE, (_, index) => mathReplacements[Number(index)] ?? '');

  return html;
}

export default function SafeHtml({ content, className = '', as: Component = 'div' }: SafeHtmlProps) {
  if (!content) return null;

  const html = parseMarkdownToHtml(content);

  return (
    <Component
      className={`[&_a]:text-[#4C9A3A] dark:[&_a]:text-[#6CC24A] [&_a]:underline [&_a:hover]:text-[#1F3A42] dark:[&_a:hover]:text-white
        [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4
        [&_p]:mb-3 [&_p:last-child]:mb-0
        [&_h1]:font-display [&_h1]:font-bold [&_h1]:text-2xl [&_h1]:text-[#1F3A42] dark:[&_h1]:text-white [&_h1]:mt-6 [&_h1]:mb-3
        [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-xl [&_h2]:text-[#1F3A42] dark:[&_h2]:text-white [&_h2]:mt-5 [&_h2]:mb-2.5
        [&_h3]:font-display [&_h3]:font-bold [&_h3]:text-lg [&_h3]:text-[#1F3A42] dark:[&_h3]:text-[#8FE07A] [&_h3]:mt-4 [&_h3]:mb-2
        [&_h4]:font-display [&_h4]:font-bold [&_h4]:text-base [&_h4]:text-[#1F3A42] dark:[&_h4]:text-white [&_h4]:mt-3 [&_h4]:mb-1.5
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:rounded-2xl [&_table]:overflow-hidden [&_table]:border [&_table]:border-[#1F3A42]/10 dark:[&_table]:border-white/10
        [&_th]:p-3 [&_th]:text-left [&_th]:font-bold [&_th]:text-xs sm:[&_th]:text-sm [&_th]:bg-[#F5FAF2] dark:[&_th]:bg-[#1B2426] [&_th]:text-[#1F3A42] dark:[&_th]:text-white [&_th]:border-b [&_th]:border-[#1F3A42]/10 dark:[&_th]:border-white/10
        [&_td]:p-3 [&_td]:text-xs sm:[&_td]:text-sm [&_td]:border-b [&_td]:border-[#1F3A42]/8 dark:[&_td]:border-white/5
        [&_tr:last-child_td]:border-b-0
        [&_img]:rounded-xl [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3
        [&_blockquote]:border-l-4 [&_blockquote]:border-[#4C9A3A] [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-3 [&_blockquote]:italic
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
