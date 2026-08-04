'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { DocumentCodeBlock } from '@/components/content/DocumentCodeBlock';
import { MermaidDiagram } from '@/components/content/MermaidDiagram';
import { PlotlyGraph } from '@/components/content/PlotlyGraph';
import { cn } from '@/utils';

function isBlockCode(
  className: string | undefined,
  children: React.ReactNode,
): children is string {
  return typeof children === 'string' && Boolean(className?.includes('language-'));
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="chat-md-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="chat-md-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="chat-md-h3">{children}</h3>,
  h4: ({ children }) => <h4 className="chat-md-h4">{children}</h4>,
  p: ({ children }) => <p className="chat-md-p">{children}</p>,
  strong: ({ children }) => <strong className="chat-md-strong">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="chat-md-ul">{children}</ul>,
  ol: ({ children }) => <ol className="chat-md-ol">{children}</ol>,
  li: ({ children }) => <li className="chat-md-li">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="chat-md-a"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="chat-md-blockquote">{children}</blockquote>,
  hr: () => <hr className="chat-md-hr" />,
  table: ({ children }) => (
    <div className="chat-md-table-wrap">
      <table className="chat-md-table">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="chat-md-th">{children}</th>,
  td: ({ children }) => <td className="chat-md-td">{children}</td>,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} className="chat-md-img" loading="lazy" />
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    if (isBlockCode(className, children)) {
      const language = /language-(\w+)/.exec(className ?? '')?.[1];

      if (language === 'mermaid') {
        return <MermaidDiagram code={children.trim()} />;
      }

      if (language === 'plotly' || language === 'graph') {
        return <PlotlyGraph code={children.trim()} />;
      }

      return <DocumentCodeBlock code={children.trim()} language={language} />;
    }

    const text = String(children).replace(/\n$/, '');
    const trimmed = text.trim();

    if (trimmed.startsWith('mermaid\n')) {
      return <MermaidDiagram code={trimmed.slice('mermaid\n'.length).trim()} />;
    }

    if (trimmed.startsWith('plotly\n') || trimmed.startsWith('graph\n')) {
      const prefix = trimmed.startsWith('plotly\n') ? 'plotly\n' : 'graph\n';
      return <PlotlyGraph code={trimmed.slice(prefix.length).trim()} />;
    }

    return <code className="chat-md-code">{children}</code>;
  },
};

export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn('chat-markdown', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
