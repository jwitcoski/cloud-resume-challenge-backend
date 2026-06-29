import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type StudyGuideMarkdownProps = {
  content: string;
};

export default function StudyGuideMarkdown({ content }: StudyGuideMarkdownProps) {
  return (
    <article className="study-guide-prose text-[#444] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl sm:text-3xl font-bold text-[#333] mt-8 mb-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-[#333] mt-10 mb-3 pb-1 border-b border-[#eee]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-[#333] mt-6 mb-2">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-4 text-[#444]">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="text-[#444]">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[#333]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="my-8 border-[#eee]" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-200 pl-4 my-4 text-[#555] italic">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-md bg-[#f6f8fa] border border-[#e5e5e5] p-4 text-sm font-mono text-[#333] my-4 whitespace-pre">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-[#f4f4f4] px-1.5 py-0.5 text-sm font-mono text-[#333]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-0">{children}</pre>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full text-sm border-collapse border border-[#ddd]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#fafafa] border-b border-[#ddd]">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-[#eee]">{children}</tr>,
          th: ({ children }) => (
            <th className="text-left p-2 font-semibold text-[#333]">{children}</th>
          ),
          td: ({ children }) => <td className="p-2 align-top text-[#555]">{children}</td>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-[#007bff] hover:underline"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
