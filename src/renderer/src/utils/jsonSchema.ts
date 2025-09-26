import z from "zod"
const FolderSchema = z.object({
  type: z.literal("folder"),
  folder: z.array(z.object({ name: z.string(), path: z.string(), type: z.string(), size: z.string(), timestamp: z.string() })),
});

export default FolderSchema;
