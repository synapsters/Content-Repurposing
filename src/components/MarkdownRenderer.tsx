import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`prose prose-sm max-w-none text-gray-700 ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: (props) => <h1 className="text-xl font-bold text-gray-900 mb-3" {...props} />,
                    h2: (props) => <h2 className="text-lg font-semibold text-gray-800 mb-2" {...props} />,
                    h3: (props) => <h3 className="text-base font-medium text-gray-800 mb-2" {...props} />,
                    h4: (props) => <h4 className="text-sm font-medium text-gray-800 mb-2" {...props} />,
                    p: (props) => <p className="mb-3 leading-relaxed" {...props} />,
                    ul: (props) => <ul className="list-disc list-outside ml-6 mb-3 space-y-1" {...props} />,
                    ol: (props) => <ol className="list-decimal list-outside ml-6 mb-3 space-y-1" {...props} />,
                    li: (props) => <li className="text-gray-700 pl-2" {...props} />,
                    strong: (props) => <strong className="font-semibold text-gray-900" {...props} />,
                    em: (props) => <em className="italic text-gray-800" {...props} />,
                    code: (props) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                    pre: (props) => <pre className="bg-gray-50 p-3 rounded-lg overflow-x-auto text-sm" {...props} />,
                    blockquote: (props) => <blockquote className="border-l-4 border-blue-200 pl-4 italic text-gray-600 mb-3" {...props} />,
                    table: (props) => <table className="min-w-full border border-gray-200 mb-3" {...props} />,
                    th: (props) => <th className="border border-gray-200 px-3 py-2 bg-gray-50 font-semibold text-left" {...props} />,
                    td: (props) => <td className="border border-gray-200 px-3 py-2" {...props} />,
                    a: (props) => <a className="text-blue-600 hover:text-blue-800 underline" {...props} />,
                    hr: (props) => <hr className="border-gray-200 my-4" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
