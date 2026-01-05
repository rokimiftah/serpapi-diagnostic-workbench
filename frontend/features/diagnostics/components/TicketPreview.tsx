import type { TicketTemplate } from "../../../../shared/types/index.ts";

import { useState } from "react";

interface TicketPreviewProps {
  ticket: TicketTemplate;
}

export function TicketPreview({ ticket }: TicketPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const markdown = `# ${ticket.title}\n\n${ticket.body}`;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">GitHub Issue Template</h3>
        <button
          type="button"
          onClick={handleCopy}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            copied ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-sm text-gray-500">Title</p>
        <p className="rounded-lg bg-gray-50 p-3 font-medium text-gray-900">{ticket.title}</p>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-sm text-gray-500">Labels</p>
        <div className="flex flex-wrap gap-2">
          {ticket.labels.map((label) => (
            <span key={label} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm text-gray-500">Body Preview</p>
        <div className="max-h-96 overflow-auto rounded-lg bg-gray-50 p-4">
          <pre className="font-mono text-sm whitespace-pre-wrap text-gray-700">{ticket.body}</pre>
        </div>
      </div>
    </div>
  );
}
