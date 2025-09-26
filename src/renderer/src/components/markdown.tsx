import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownComponentProps {
  response: string;
}

// Customize this component with your own styling
export const MarkdownComponent = ({ response }: MarkdownComponentProps) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>;
};