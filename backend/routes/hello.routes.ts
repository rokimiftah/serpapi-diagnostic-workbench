import { Hono } from "hono";

const helloRouter = new Hono().get("/hello", (c) => {
  return c.json({ message: "Hono Hello!" });
});

export default helloRouter;
