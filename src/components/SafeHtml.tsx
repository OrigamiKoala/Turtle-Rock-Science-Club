import React from 'react';

interface SafeHtmlProps {
  content?: string;
  className?: string;
  as?: React.ElementType;
}

export function parseMarkdownToHtml(text: string): string {
  if (!text) return '';

  // If it already contains complete HTML structures, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  let html = text;

  // Bold: **text** or __text__
  html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Italics: *text* or _text_
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // Inline code: `text`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>');

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#4C9A3A] dark:text-[#6CC24A] underline hover:text-[#1F3A42]">$1</a>'
  );

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

  // Line breaks
  html = html.replace(/\n\n/g, '<br /><br />').replace(/\n/g, '<br />');

  return html;
}

export default function SafeHtml({ content, className = '', as: Component = 'div' }: SafeHtmlProps) {
  if (!content) return null;

  const html = parseMarkdownToHtml(content);

  return (
    <Component
      className={`[&_a]:text-[#4C9A3A] dark:[&_a]:text-[#6CC24A] [&_a]:underline [&_a:hover]:text-[#1F3A42] [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
