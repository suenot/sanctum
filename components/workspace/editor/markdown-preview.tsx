"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="h-full overflow-auto bg-[#1e1e1e] p-6">
      <article className="prose prose-invert prose-sm max-w-none prose-headings:border-b prose-headings:border-border/30 prose-headings:pb-2 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#2d2d2d] prose-pre:border prose-pre:border-border/30 prose-a:text-primary prose-table:border-collapse prose-th:border prose-th:border-border/30 prose-th:px-3 prose-th:py-1.5 prose-td:border prose-td:border-border/30 prose-td:px-3 prose-td:py-1.5 prose-img:rounded-md prose-blockquote:border-l-primary/50 prose-hr:border-border/30">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
