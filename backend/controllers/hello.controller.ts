import type { Context } from "hono";

export const helloController = {
  getHello: (c: Context) => {
    return c.json({ message: "Hono!" });
  },
};
