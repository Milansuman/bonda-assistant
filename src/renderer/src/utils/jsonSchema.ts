import z from "zod"

const FolderSchema = z.object({
  type: z.literal("folder"),
  folder: z.array(z.object({ name: z.string(), path: z.string(), type: z.string(), size: z.string(), timestamp: z.string() })),
});

const SystemSpecSchema = z.object({
  type: z.literal("system-specs"),
  system: z.object({
    computerName: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    operatingSystem: z.object({
      name: z.string(),
      version: z.string(),
      installed: z.string(),
      systemType: z.string(),
      windowsDirectory: z.string(),
    }),
  }),
  cpu: z.object({
    processor: z.string(),
    speedMHz: z.number(),
  }),
  memory: z.object({
    totalRAM_MB: z.number(),
    availableRAM_MB: z.number(),
    virtualMemory_MB: z.number(),
  }),
  storage: z.object({
    pageFileLocation: z.string(),
  }),
  network: z.object({
    wifiAdapter: z.string(),
    currentIP: z.string(),
    vmwareAdaptersInstalled: z.boolean(),
  }),
  security: z.object({
    windowsUpdatesInstalled: z.number(),
    virtualizationEnabled: z.boolean(),
    secureBootEnabled: z.boolean(),
  }),
});

export { FolderSchema, SystemSpecSchema };
export default FolderSchema;
