import type { Context } from "hono";

import { userService } from "../services/user.service.ts";

export const usersController = {
  getAll: (c: Context) => {
    const users = userService.getAll();
    return c.json(users);
  },

  getById: (c: Context) => {
    const id = Number(c.req.param("id"));
    const user = userService.getById(id);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(user);
  },
};
