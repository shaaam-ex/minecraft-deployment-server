import express from "express";
import { exec } from "child_process";
import { SERVER_CONFIGS } from "./configs/serverConfigs.js";
import { logInfo, logError } from "./logger.js";
import { SUPPORTED_VERSIONS } from "./enums/versions.js";
import os from "os";

const app = express();
app.use(express.json());

const DEPLOYMENT_PORT = 4000;

/**
 * POST /deploy
 * Body:
 * {
 *   containerName: string,
 *   image: string,
 *   internalPort: number,
 *   memory?: string,
 *   cpus?: string,
 *   env?: object
 * }
 */

function getIPv4Address() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];

    for (const addr of addresses) {
      // Filter for IPv4 and ensure it's not a loopback address (127.0.0.1)
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return "127.0.0.1"; // Fallback if no external IP is found
}

function processContainerName(containerName) {
  return containerName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

app.post("/deploy", (req, res) => {
  const { containerName, type, version, memory = "1g", cpus = "1" } = req.body;

  logInfo("Incoming deploy request", {
    containerName,
    type,
    version,
  });

  if (!containerName || !type || !version) {
    return res.status(400).json({
      success: false,
      message: "containerName, type and version are required",
    });
  }

  if (!SUPPORTED_VERSIONS.includes(version)) {
    return res.status(400).json({
      success: false,
      message: "Unsupported Minecraft version",
    });
  }

  const config = SERVER_CONFIGS[type];

  if (!config) {
    return res.status(400).json({
      success: false,
      message: "Invalid server type",
    });
  }

  const env = {
    ...config.baseEnv,
    VERSION: version,
  };

  const envArgs = Object.entries(env)
    .map(([k, v]) => `-e ${k}=${v}`)
    .join(" ");

  const processedContainerName = processContainerName(containerName);

  const dockerRunCmd = `
    docker run -d -P \
    --name ${processedContainerName} \
    --memory=${memory} \
    --cpus=${cpus} \
    ${envArgs} \
    ${config.image}
  `;

  logInfo("Starting container", { processedContainerName });

  exec(dockerRunCmd, (err, stdout, stderr) => {
    if (err) {
      logError("Docker run failed", { stderr });
      return res.status(500).json({
        success: false,
        message: "Docker run failed",
      });
    }

    setTimeout(() => {
      const inspectCmd = `docker port ${processedContainerName} ${config.internalPort}`;

      exec(inspectCmd, (err, stdout, stderr) => {
        if (err) {
          logError("Port inspection failed", { stderr });
          return res.status(500).json({
            success: false,
            message: "Failed to get assigned port",
          });
        }

        const hostPort = stdout.trim().split(":").pop();

        logInfo("Server deployed successfully", {
          processedContainerName,
          hostPort,
          version,
          type,
        });

        // Getting current ipv4 address
        res.status(200).json({
          success: true,
          data: {
            ipAddress: getIPv4Address(),
            port: hostPort,
          },
        });
      });
    }, 1000);
  });
});

app.post("/stop", (req, res) => {
  const { containerName } = req.body;

  const processedContainerName = processContainerName(containerName);

  exec(`docker stop ${processedContainerName}`, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, status: "stopped" });
  });
});

app.post("/start", (req, res) => {
  const { containerName } = req.body;

  const processedContainerName = processContainerName(containerName);

  exec(`docker start ${processedContainerName}`, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, status: "started" });
  });
});

app.post("/delete", (req, res) => {
  const { containerName } = req.body;

  const processedContainerName = processContainerName(containerName);

  exec(`docker rm ${processedContainerName}`, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ status: "deleted" });
  });
});

app.get("/status/:containerName", (req, res) => {
  const { containerName } = req.params;

  const processedContainerName = processContainerName(containerName);

  const inspectCmd = `docker inspect ${processedContainerName}`;

  exec(inspectCmd, (err, stdout) => {
    if (err) {
      // Container does not exist
      return res.json({
        success: false,
        message: "Container not found",
      });
    }

    try {
      const data = JSON.parse(stdout)[0];
      const state = data.State;

      return res.json({
        success: true,
        data: {
          containerName,
          exists: true,
          status: state.Running,
        },
      });
    } catch (parseError) {
      return res.status(500).json({
        error: "Failed to parse docker inspect output",
      });
    }
  });
});

app.listen(DEPLOYMENT_PORT, () => {
  console.log(`Deployment server running on port ${DEPLOYMENT_PORT}`);
});
