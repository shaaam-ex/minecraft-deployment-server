import { ServerType } from "../types/server.js";

export const SERVER_CONFIGS = {
  [ServerType.VANILLA]: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    env: {
      EULA: "TRUE",
      TYPE: "VANILLA",
    },
  },

  [ServerType.PAPER]: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    env: {
      EULA: "TRUE",
      TYPE: "PAPER",
    },
  },

  [ServerType.FABRIC]: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    env: {
      EULA: "TRUE",
      TYPE: "FABRIC",
    },
  },

  [ServerType.FORGE]: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    env: {
      EULA: "TRUE",
      TYPE: "FORGE",
    },
  },
};
