import React, { useMemo } from 'react';
import katex from 'katex';

interface LatexProps {
  math: string;
  displayMode?: boolean;
  className?: string;
  inline?: boolean;
}

/**
 * Converts common chemical formula strings (e.g. "CH3COOH", "H2O", "CO3^2-", "Fe2O3", "(NH4)2SO4", "H+", "OH-")
 * into valid KaTeX math strings if not already in LaTeX format.
 */
export function chemToLatex(formula: string): string {
  if (!formula) return '';
  let str = formula.trim();

  // If already contains LaTeX commands like \text, \frac, \times, etc.
  if (str.includes('\\')) {
    return str;
  }

  // Handle unicode subscripts (₀-₉) and superscripts (⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹)
  str = str
    .replace(/₀/g, '0').replace(/₁/g, '1').replace(/₂/g, '2').replace(/₃/g, '3').replace(/₄/g, '4')
    .replace(/₅/g, '5').replace(/₆/g, '6').replace(/₇/g, '7').replace(/₈/g, '8').replace(/₉/g, '9')
    .replace(/⁺/g, '^+').replace(/⁻/g, '^-')
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4');

  // Convert chemical notation like H2O, CH3COO^-, Na+, Cl-, CO3^2-, Ca(OH)2
  // We can wrap elements and numbers: e.g. H_2O, \text{CH}_3\text{COOH}
  // Formula regex for chemical tokenization
  const tokens = str.match(/([A-Z][a-z]?|\(|\)|\d+|\^[\w+-]+|\+|-|⇌|→|⟶|\s+)/g);
  if (!tokens) {
    return `\\text{${str}}`;
  }

  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^[A-Z][a-z]?$/.test(t)) {
      out += `\\text{${t}}`;
    } else if (/^\d+$/.test(t)) {
      // If preceded by element or closing paren, it's subscript
      const prev = tokens[i - 1];
      if (prev && (/^[A-Z][a-z]?$/.test(prev) || prev === ')' || prev === ']')) {
        out += `_{${t}}`;
      } else {
        out += t;
      }
    } else if (t === '+' || t === '-') {
      // Check if it's an ion charge at end or after element/number
      const prev = tokens[i - 1];
      if (prev && (/^[A-Z][a-z]?$/.test(prev) || /^\d+$/.test(prev) || prev === ')' || prev === ']')) {
        out += `^{${t}}`;
      } else {
        out += ` + `;
      }
    } else if (t.startsWith('^')) {
      out += `^{${t.slice(1)}}`;
    } else if (t === '⇌') {
      out += ' \\rightleftharpoons ';
    } else if (t === '→' || t === '⟶') {
      out += ' \\longrightarrow ';
    } else if (t === '(' || t === ')' || t === '[' || t === ']') {
      out += t;
    } else {
      out += t;
    }
  }

  return out;
}

/**
 * Render pure LaTeX expression via KaTeX
 */
export const Latex: React.FC<LatexProps> = ({
  math,
  displayMode = false,
  className = '',
  inline = true
}) => {
  const html = useMemo(() => {
    if (!math) return '';
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        trust: true,
        strict: false
      });
    } catch {
      return math;
    }
  }, [math, displayMode]);

  const Component = displayMode || !inline ? 'div' : 'span';

  return (
    <Component
      className={`inline-katex ${displayMode ? 'my-2 flex justify-center' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/**
 * Component to render a chemical formula with KaTeX
 */
export const Chem: React.FC<{ formula: string; className?: string }> = ({ formula, className = '' }) => {
  const latexStr = useMemo(() => chemToLatex(formula), [formula]);
  return <Latex math={latexStr} displayMode={false} className={className} />;
};

/**
 * Parses mixed text containing `$math$` or `$$display math$$` into React elements with KaTeX.
 */
export const MathText: React.FC<{ text: string; className?: string; as?: React.ElementType }> = ({
  text,
  className = '',
  as: Component = 'span'
}) => {
  const elements = useMemo(() => {
    if (!text) return null;

    // Pattern matches:
    // 1. $$ ... $$ (display mode)
    // 2. $ ... $ (inline mode)
    const regex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        return <Latex key={index} math={math} displayMode={true} />;
      }

      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1).trim();
        return <Latex key={index} math={math} displayMode={false} />;
      }

      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  }, [text]);

  return <Component className={className}>{elements}</Component>;
};

export default Latex;
