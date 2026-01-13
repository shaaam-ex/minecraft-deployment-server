import express from "express";
import { exec } from "child_process";
import { SERVER_CONFIGS } from "./configs/serverConfigs.js";
import { logInfo, logError } from "./logger.js";

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
app.post("/deploy", (req, res) => {
  const { containerName, type, memory = "1g", cpus = "1" } = req.body;

  logInfo("Incoming deploy request", {
    containerName,
    type,
    memory,
    cpus,
  });

  if (!containerName || !type) {
    logError("Missing required fields", req.body);
    return res
      .status(400)
      .json({ error: "containerName and type are required" });
  }

  const config = SERVER_CONFIGS[type];

  if (!config) {
    logError("Invalid server type", { type });
    return res.status(400).json({ error: "Invalid server type" });
  }

  const { image, internalPort, env } = config;

  logInfo("Resolved server configuration", {
    type,
    image,
    internalPort,
    env,
  });

  const envArgs = Object.entries(env)
    .map(([k, v]) => `-e ${k}=${v}`)
    .join(" ");

  const dockerRunCmd = `
    docker run -d -P \
    --name ${containerName} \
    --memory=${memory} \
    --cpus=${cpus} \
    ${envArgs} \
    ${image}
  `;

  logInfo("Executing docker run", {
    containerName,
    image,
  });

  exec(dockerRunCmd, (err, stdout, stderr) => {
    if (err) {
      logError("Docker run failed", {
        containerName,
        stderr,
        error: err.message,
      });

      return res.status(500).json({
        error: "Docker run failed",
        details: stderr || err.message,
      });
    }

    logInfo("Docker container started", {
      containerName,
      stdout: stdout?.trim(),
    });

    setTimeout(() => {
      const inspectCmd = `docker port ${containerName} ${internalPort}`;

      logInfo("Inspecting container port", {
        containerName,
        internalPort,
      });

      exec(inspectCmd, (err, stdout, stderr) => {
        if (err) {
          logError("Failed to get assigned port", {
            containerName,
            stderr,
            error: err.message,
          });

          return res.status(500).json({
            error: "Failed to get assigned port",
            details: stderr || err.message,
          });
        }

        const hostPort = stdout.trim().split(":").pop();

        logInfo("Port assigned successfully", {
          containerName,
          hostPort,
        });

        return res.json({
          containerName,
          type,
          hostPort,
          running: true,
        });
      });
    }, 1000);
  });
});

app.post("/stop", (req, res) => {
  const { containerName } = req.body;

  exec(`docker stop ${containerName}`, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ status: "stopped" });
  });
});

app.post("/delete", (req, res) => {
  const { containerName } = req.body;

  exec(`docker rm ${containerName}`, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ status: "deleted" });
  });
});

app.get("/status/:containerName", (req, res) => {
  const { containerName } = req.params;

  const inspectCmd = `docker inspect ${containerName}`;

  exec(inspectCmd, (err, stdout) => {
    if (err) {
      // Container does not exist
      return res.json({
        containerName,
        exists: false,
      });
    }

    try {
      const data = JSON.parse(stdout)[0];
      const state = data.State;

      return res.json({
        containerName,
        exists: true,
        status: state.Running,
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
