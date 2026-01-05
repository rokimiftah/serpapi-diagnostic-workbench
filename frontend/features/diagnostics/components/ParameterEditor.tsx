import { useState } from "react";

interface ParameterEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ParameterEditor({ value, onChange, error }: ParameterEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        id="params-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={`{
  "q": "coffee"
}`}
        className={`h-48 w-full resize-none rounded-lg border bg-gray-50 p-3 font-mono text-sm transition-colors focus:bg-white focus:outline-none sm:h-64 sm:p-4 ${
          error ? "border-red-300 focus:border-red-500" : isFocused ? "border-blue-500" : "border-gray-200"
        }`}
      />
      {error && <p className="text-xs text-red-600 sm:text-sm">{error}</p>}
    </div>
  );
}
