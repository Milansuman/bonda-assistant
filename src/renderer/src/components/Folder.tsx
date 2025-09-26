
import { Folder as FolderIcon, File } from "lucide-react";
import { type LLMOutputComponent } from "@llm-ui/react";
import FolderSchema from "../utils/jsonSchema";
import { parseJson5 } from "@llm-ui/json";

const Folder: LLMOutputComponent = ({ blockMatch }) => {
  if (!blockMatch.isVisible) {
    return null;
  }

  // Parse and validate the JSON using the schema
  const { success, data, error } = FolderSchema.safeParse(
    parseJson5(blockMatch.output),
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
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 my-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📁</span>
        <span className="font-medium text-gray-200">Folder Contents</span>
      </div>
      
      <div className="space-y-2">
        {data.folder.map((item, index) => {
          const Icon = item.type === "directory" ? FolderIcon : File;
          const iconColor = item.type === "directory" ? "text-blue-400" : "text-gray-300";
          
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-700/30 transition-colors"
            >
              <Icon className={`w-5 h-5 ${iconColor}`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-200">{item.name}</div>
                <div className="text-xs text-gray-400">{item.path}</div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>Type: {item.type}</div>
                <div>Size: {item.size}</div>
                <div>{item.timestamp}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Folder