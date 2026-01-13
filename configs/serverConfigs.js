export const SERVER_CONFIGS = {
  VANILLA: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    baseEnv: {
      EULA: "TRUE",
      TYPE: "VANILLA",
    },
  },

  PAPER: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    baseEnv: {
      EULA: "TRUE",
      TYPE: "PAPER",
    },
  },

  FABRIC: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    baseEnv: {
      EULA: "TRUE",
      TYPE: "FABRIC",
    },
  },

  FORGE: {
    image: "itzg/minecraft-server",
    internalPort: 25565,
    baseEnv: {
      EULA: "TRUE",
      TYPE: "FORGE",
    },
  },
};
