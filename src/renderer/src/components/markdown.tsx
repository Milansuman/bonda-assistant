import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type LLMOutputComponent } from "@llm-ui/react";

interface MarkdownComponentProps {
  response: string;
}

// Legacy component for direct usage (backwards compatibility)
export const MarkdownComponentDirect = ({ response }: MarkdownComponentProps) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>;
};

// Main component that works with LLM-UI
export const MarkdownComponent: LLMOutputComponent = ({ blockMatch }) => {
  const markdown = blockMatch.output;
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
};