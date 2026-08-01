import React from 'react';

interface SafeHtmlProps {
  content?: string;
  className?: string;
  as?: React.ElementType;
}

export default function SafeHtml({ content, className = '', as: Component = 'div' }: SafeHtmlProps) {
  if (!content) return null;

  // Check if string contains basic HTML tags (e.g. <a...>, <b>, <p>, etc.)
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtml) {
    return (
      <Component
        className={`[&_a]:text-[#4C9A3A] dark:[&_a]:text-[#6CC24A] [&_a]:underline [&_a:hover]:text-[#1F3A42] [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <Component className={`whitespace-pre-line ${className}`}>{content}</Component>;
}
