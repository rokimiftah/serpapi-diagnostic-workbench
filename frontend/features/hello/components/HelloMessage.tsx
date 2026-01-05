import { Button, Card } from "../../../components";
import { useHello } from "../hooks/useHello";

interface HelloMessageProps {
  title?: string;
}

export function HelloMessage({ title = "Full Stack Hono!" }: HelloMessageProps) {
  const { message, loading, error, fetchMessage } = useHello();

  return (
    <Card className="w-full max-w-md">
      <h1 className="mb-4 text-3xl font-bold text-gray-800">{title}</h1>
      <p className="mb-4 text-gray-600">Bun + Hono + React + Tailwind</p>
      <div className="mb-4 rounded-lg bg-indigo-50 p-4">
        <p className="text-sm font-medium text-indigo-600">Server Response:</p>
        {loading ? (
          <p className="text-lg text-indigo-800">Loading...</p>
        ) : error ? (
          <p className="text-lg text-red-800">Error: {error.message}</p>
        ) : (
          <p className="text-lg text-indigo-800">{message || "Click to fetch"}</p>
        )}
      </div>
      <Button onClick={fetchMessage} disabled={loading}>
        {loading ? "Fetching..." : "Fetch Message"}
      </Button>
    </Card>
  );
}
