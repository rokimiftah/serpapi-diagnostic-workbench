import type { User } from "../types/user.types.ts";

const users: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];

export const userService = {
  getAll: (): User[] => {
    return users;
  },

  getById: (id: number): User | undefined => {
    return users.find((user) => user.id === id);
  },
};
