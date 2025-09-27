// SystemSpecRenderer.tsx
"use client";

import React, { useState } from "react";
import {
  Monitor,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Shield,
  ChevronDown,
  ChevronRight,
  Computer,
  Info,
  Copy,
  Check,
} from "lucide-react";

type SystemSpecs = {
  type: "system-specs";
  system: {
    computerName: string;
    manufacturer: string;
    model: string;
    operatingSystem: {
      name: string;
      version: string;
      installed: string;
      systemType: string;
      windowsDirectory: string;
    };
  };
  cpu: {
    processor: string;
    speedMHz: number;
  };
  memory: {
    totalRAM_MB: number;
    availableRAM_MB: number;
    virtualMemory_MB: number;
  };
  storage: {
    pageFileLocation: string;
  };
  network: {
    wifiAdapter: string;
    currentIP: string;
    vmwareAdaptersInstalled: boolean;
  };
  security: {
    windowsUpdatesInstalled: number;
    virtualizationEnabled: boolean;
    secureBootEnabled: boolean;
  };
};

export default function SystemSpecRenderer(props: {
  data?: SystemSpecs;
  specs?: SystemSpecs;
}) {
  // accept either prop name to avoid breaking changes
  const data = props.data ?? props.specs!;
  if (!data) return null;

  // calculated values
  const ramUsagePercent = Math.round(
    ((data.memory.totalRAM_MB - data.memory.availableRAM_MB) /
      data.memory.totalRAM_MB) *
      100
  );

  return (
    // Outer wrapper: tailwind + inline style fallback for gap
    <div
      className="w-full max-w-4xl mx-auto p-6 bg-gray-900 text-gray-100 rounded-2xl shadow-xl"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      
<div className="flex items-center justify-center gap-3 mb-6">
  <Computer className="w-6 h-6 text-blue-400" />
  <div className="text-center">
    <h2 className="text-2xl font-bold">System Specifications</h2>
    <p className="text-gray-400">{data.system.computerName}</p>
  </div>
</div>


      {/* explicit spacer fallback in case gap is ignored */}
      <div aria-hidden style={{ height: 8 }} />

      {/* Sections container: uses flex-col gap + inline fallback */}
      <div
        className="flex flex-col"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <SpecSection title="System Information" icon={<Monitor size={18} />}>
          <SpecItem label="Computer Name" value={data.system.computerName} copy />
          <SpecItem label="Manufacturer" value={data.system.manufacturer} />
          <SpecItem label="Model" value={data.system.model} />
          <SpecItem label="Operating System" value={data.system.operatingSystem.name} />
          <SpecItem label="OS Version" value={data.system.operatingSystem.version} />
          <SpecItem label="Installed" value={data.system.operatingSystem.installed} />
          <SpecItem label="System Type" value={data.system.operatingSystem.systemType} />
          <SpecItem label="Windows Directory" value={data.system.operatingSystem.windowsDirectory} copy />
        </SpecSection>

        <SpecSection title="Processor" icon={<Cpu size={18} />}>
          <SpecItem label="Processor" value={data.cpu.processor} />
          <SpecItem label="Base Speed" value={`${data.cpu.speedMHz} MHz`} />
          <SpecItem label="Base Speed (GHz)" value={`${(data.cpu.speedMHz / 1000).toFixed(1)} GHz`} />
        </SpecSection>

        <SpecSection title="Memory" icon={<MemoryStick size={18} />}>
          <SpecItem label="Total RAM" value={`${data.memory.totalRAM_MB} MB`} />
          <SpecItem label="Available RAM" value={`${data.memory.availableRAM_MB} MB`} />
          <SpecItem label="RAM Usage" value={`${ramUsagePercent}% (${data.memory.totalRAM_MB - data.memory.availableRAM_MB} MB used)`} />
          <SpecItem label="Virtual Memory" value={`${data.memory.virtualMemory_MB} MB`} />

          {/* Memory usage bar (explicit sizing + margin) */}
          <div className="mt-3 p-3 bg-gray-700/30 rounded-md" style={{ marginTop: 7 }}>
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Memory Usage</span>
              <span>{ramUsagePercent}%</span>
            </div>
            <div className="w-full bg-gray-600/50 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${ramUsagePercent > 80 ? "bg-red-500" : ramUsagePercent > 60 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${ramUsagePercent}%` }}
              />
            </div>
          </div>
        </SpecSection>

        <SpecSection title="Storage" icon={<HardDrive size={18} />}>
          <SpecItem label="Page File Location" value={data.storage.pageFileLocation} copy />
        </SpecSection>

        <SpecSection title="Network" icon={<Wifi size={18} />}>
          <SpecItem label="WiFi Adapter" value={data.network.wifiAdapter} />
          <SpecItem label="Current IP Address" value={data.network.currentIP} copy />
          <SpecItem label="VMware Adapters Installed" value={data.network.vmwareAdaptersInstalled ? "Yes" : "No"} />
        </SpecSection>

        <SpecSection title="Security" icon={<Shield size={18} />}>
          <SpecItem label="Windows Updates Installed" value={`${data.security.windowsUpdatesInstalled}`} />
          <SpecItem label="Virtualization" value={data.security.virtualizationEnabled ? "Enabled" : "Disabled"} />
          <SpecItem label="Secure Boot" value={data.security.secureBootEnabled ? "Enabled" : "Disabled"} />

          {/* Summary */}
          <div className="mt-3 p-3 bg-gray-700/30 rounded-md" style={{ marginTop: 7 }}>
            <div className="flex items-center gap-2 mb-2">
              <Info size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-gray-200">Security Status</span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Security Features:</span>
                <span className="text-gray-200">
                  {[data.security.virtualizationEnabled && "Virtualization", data.security.secureBootEnabled && "Secure Boot"].filter(Boolean).length} / 2 Enabled
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Update Status:</span>
                <span className="text-gray-200">
                  {data.security.windowsUpdatesInstalled > 0 ? "Up to date" : "Updates available"}
                </span>
              </div>
            </div>
          </div>
        </SpecSection>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function SpecSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode; }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className="bg-gray-800 rounded-xl shadow-lg overflow-hidden" style={{ marginBottom: 10 }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-4 hover:bg-gray-700/50 transition-colors"
        style={{ padding: 16 }}
      >
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex-shrink-0">{icon}</span>
          <span>{title}</span>
        </div>
        <div>{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
      </button>

      {isExpanded && (
        // flex-col + inline gap fallback
        <div className="p-4" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
          {children}
        </div>
      )}
    </section>
  );
}

function SpecItem({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="flex items-center justify-between"
      style={{ paddingTop: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-medium">{value}</span>
        {copy && (
          <button onClick={handleCopy} title={copied ? "Copied!" : "Copy"} className="p-1 rounded hover:bg-gray-700/50">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
