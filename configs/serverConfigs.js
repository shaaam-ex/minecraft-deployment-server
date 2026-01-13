export const SERVER_CONFIGS = {
  VANILLA: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    baseEnv: {
      EULA: "TRUE",
      TYPE: "VANILLA",
      ONLINE_MODE: "FALSE",
    },
  },

  PAPER: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    baseEnv: {
      EULA: "TRUE",
      TYPE: "PAPER",
      ONLINE_MODE: "FALSE",
    },
  },

  FABRIC: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    baseEnv: {
      EULA: "TRUE",
      TYPE: "FABRIC",
      ONLINE_MODE: "FALSE",
    },
  },

  FORGE: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    baseEnv: {
      EULA: "TRUE",
      TYPE: "FORGE",
      ONLINE_MODE: "FALSE",
    },
  },
};
