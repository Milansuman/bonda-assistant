import React from "react";
import { markdownLookBack } from "@llm-ui/markdown";
import { useLLMOutput, type LLMOutputComponent } from "@llm-ui/react";
import { jsonBlock, parseJson5 } from "@llm-ui/json";
import { MarkdownComponent } from "./markdown";
import FolderSchema from "../utils/jsonSchema";
import { Folder as FolderIcon, File } from "lucide-react";

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

export const MessageRenderer: React.FC<MessageRendererProps> = ({ content, isStreamFinished }) => {
  const { blockMatches } = useLLMOutput({
    llmOutput: content,
    blocks: [
      {
        ...jsonBlock({ type: "folder" }),
        component: FolderComponent,
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
