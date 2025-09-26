import React, { useState } from "react";
import { markdownLookBack } from "@llm-ui/markdown";
import { useLLMOutput, type LLMOutputComponent } from "@llm-ui/react";
import { jsonBlock, parseJson5 } from "@llm-ui/json";
import { findCompleteCodeBlock, codeBlockLookBack, parseCompleteMarkdownCodeBlock } from "@llm-ui/code";
import { MarkdownComponent } from "./markdown";
import FolderSchema from "../utils/jsonSchema";
import { Folder as FolderIcon, File, Copy, Check } from "lucide-react";

interface MessageRendererProps {
  content: string;
  isStreamFinished: boolean;
}

// Folder Component that works with LLM-UI
const FolderComponent: LLMOutputComponent = ({ blockMatch }) => {
  if (!blockMatch.isVisible) {
    return null;
  }

  // Parse and validate the JSON using the schema
  const { success, data, error } = FolderSchema.safeParse(
    parseJson5(blockMatch.output)
  );

  if (!success || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 my-2">
        <div className="text-red-400 text-sm font-medium mb-2">Invalid folder data</div>
        <div className="text-red-300 text-xs">{error ? error.toString() : "Unknown error"}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border flex flex-col gap-4 border-gray-700/50 rounded-lg p-4 my-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📁</span>
        <span className="font-medium text-gray-200">Folder Contents</span>
        <span className="text-sm text-gray-400">({Array.isArray(data.folder) ? data.folder.length : 0} items)</span>
      </div>

      {/* list container: use flex-col gap to give consistent space between each file */}
      <div className="max-h-96 overflow-y-auto">
        <div className="flex flex-col gap-4"> {/* gap-4 provides ~16px between rows */}
          {data.folder.map((item: any, index: number) => {
            // support both "directory" and "folder" as folder-type names
            const isDirectory =
              String(item?.type).toLowerCase() === "directory" ||
              String(item?.type).toLowerCase() === "folder" ||
              String(item?.type).toLowerCase() === "dir";

            const Icon = isDirectory ? FolderIcon : File;
            const iconColor = isDirectory ? "text-blue-400" : "text-gray-300";

            // safe fallbacks for display values
            const name = item?.name ?? "untitled";
            const path = item?.path ?? "-";
            const size = item?.size ?? "-";
            const timestamp = item?.timestamp ?? "";

            return (
              <div key={index} className="w-full">
                <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-md hover:bg-gray-700/30 transition-colors border border-gray-700/30">
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    {/* filename with a small bottom margin for clearer separation from path */}
                    <div className="text-sm font-medium text-gray-200 truncate mb-1">
                      {name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{path}</div>
                  </div>
                  <div className="text-right text-xs text-gray-500 flex-shrink-0 space-y-0.5">
                    <div className="capitalize">{String(item?.type ?? "").toLowerCase() || "-"}</div>
                    <div>{size} {size !== "-" ? "bytes" : ""}</div>
                    <div className="text-gray-600">{timestamp}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const highlightCode = (code: string, language: string): string => {
  let highlighted = code;
  
  if (language === 'javascript' || language === 'typescript') {
    // Keywords
    highlighted = highlighted.replace(/(const|let|var|function|class|if|else|for|while|return|import|export|from|async|await|try|catch)\b/g, '<span class="keyword">$1</span>');
    // Strings
    highlighted = highlighted.replace(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g, '<span class="string">$1$2$1</span>');
    // Comments
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
    highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
    // Numbers
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
  } else if (language === 'python') {
    // Keywords
    highlighted = highlighted.replace(/(def|class|if|else|elif|for|while|return|import|from|try|except|with|as|lambda|yield)\b/g, '<span class="keyword">$1</span>');
    // Strings
    highlighted = highlighted.replace(/('''[\s\S]*?'''|"""[\s\S]*?"""|'[^']*'|"[^"]*")/g, '<span class="string">$1</span>');
    // Comments
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
    // Numbers
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
  }
  
  return highlighted;
};

// Code Component for syntax highlighting
const CodeComponent: LLMOutputComponent = ({ blockMatch }) => {
  // Extract and parse code content from the block match
  const rawContent = String(blockMatch.outputRaw);
  const parsed = parseCompleteMarkdownCodeBlock(rawContent);
  
  const language = parsed.language || 'text';
  const code = parsed.code || rawContent;
  
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const highlightedCode = language !== 'text' ? highlightCode(code, language) : code;
  
  return (
    <div className="code-block-wrapper bg-gray-900 rounded-lg border border-gray-700 my-4">
      <div className="px-4 py-2 bg-gray-800 rounded-t-lg border-b border-gray-700 flex justify-between items-center">
        <span className="text-xs text-gray-400 font-mono uppercase">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
          title={isCopied ? 'Copied!' : 'Copy code'}
        >
          {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto p-4 text-sm">
        {language !== 'text' ? (
          <pre>
            <code 
              className="text-gray-100 font-mono whitespace-pre syntax-highlighted"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        ) : (
          <pre>
            <code className="text-gray-100 font-mono whitespace-pre">
              {code}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
};

export const MessageRenderer: React.FC<MessageRendererProps> = ({ content, isStreamFinished }) => {
  const { blockMatches } = useLLMOutput({
    llmOutput: content,
    blocks: [
      {
        ...jsonBlock({ type: "folder" }),
        component: FolderComponent,
      },
      {
        findCompleteMatch: findCompleteCodeBlock(),
        findPartialMatch: findCompleteCodeBlock(),
        lookBack: codeBlockLookBack(),
        component: CodeComponent,
      },
    ],
    fallbackBlock: {
      component: MarkdownComponent,
      lookBack: markdownLookBack(),
    },
    isStreamFinished,
  });

  return (
    <div className="llm-output-container m-2 flex flex-col gap-6">
      {blockMatches.map((blockMatch, index) => {
        const Component = blockMatch.block.component;
        return <Component key={index} blockMatch={blockMatch} />;
      })}
    </div>
  );
};

export default MessageRenderer;
