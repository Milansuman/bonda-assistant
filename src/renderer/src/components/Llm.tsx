import { markdownLookBack } from "@llm-ui/markdown";
import { useLLMOutput, useStreamExample, type LLMOutputComponent } from "@llm-ui/react";
import { jsonBlock, parseJson5 } from "@llm-ui/json";
import { MarkdownComponent } from "./markdown";
import FolderSchema from "../utils/jsonSchema";

// Fixed example with proper JSON format
const example = `Here are the folder contents:

【{"type":"folder","folder":[{"name":"Star ⭐","path":"/home/user/star","type":"directory","size":"4096","timestamp":"2025-09-26 10:30:00"},{"name":"Confetti 🎉","path":"/home/user/confetti.txt","type":"file","size":"1202","timestamp":"2025-09-26 12:02:00"}]}】

This shows the files and directories in your current location.`;

// Create a proper LLMOutputComponent for folder data
const FolderComponent: LLMOutputComponent = ({ blockMatch }) => {
  if (!blockMatch.isVisible) {
    return null;
  }

  // Parse and validate the JSON using the schema
  const { data: folderData, error } = FolderSchema.safeParse(
    parseJson5(blockMatch.output)
  );

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 my-2">
        <div className="text-red-400 text-sm font-medium mb-2">Invalid folder data</div>
        <div className="text-red-300 text-xs">{error.message}</div>
      </div>
    );
  }

  return (
    <div className="mt-5 bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 my-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📁</span>
        <span className="font-medium text-gray-200">Folder</span>
      </div>
      
      <div className="space-y-2">
        {folderData.folder.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-700/30 transition-colors"
          >
            <span className="text-xl">
              {item.type === "directory" ? "📁" : "📄"}
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-200">{item.name}</div>
              <div className="text-xs text-gray-400">{item.path}</div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>Type: {item.type}</div>
              <div>Size: {item.size} bytes</div>
              <div>{item.timestamp}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LLmUI = () => {
  const { isStreamFinished, output } = useStreamExample(example);

  const { blockMatches } = useLLMOutput({
    llmOutput: output,
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
    <div className="p-4">
      {blockMatches.map((blockMatch, index) => {
        const Component = blockMatch.block.component;
        return <Component key={index} blockMatch={blockMatch} />;
      })}
    </div>
  );
};

export default LLmUI;