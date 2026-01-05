import { useState } from "react";

import { helloApi } from "../services/helloApi.ts";

export function useHello() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessage = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await helloApi.getMessage();
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  return { message, loading, error, fetchMessage };
}
