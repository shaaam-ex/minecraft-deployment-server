import express from "express";
import { exec } from "child_process";
import { SERVER_CONFIGS } from "./configs/serverConfigs.js";

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

  if (!containerName || !type) {
    return res
      .status(400)
      .json({ error: "containerName and type are required" });
  }

  const config = SERVER_CONFIGS[type];

  if (!config) {
    return res.status(400).json({ error: "Invalid server type" });
  }

  const { image, internalPort, env } = config;

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

  exec(dockerRunCmd, (err) => {
    if (err) {
      return res.status(500).json({
        error: "Docker run failed",
        details: err.message,
      });
    }

    const inspectCmd = `docker port ${containerName} ${internalPort}`;

    exec(inspectCmd, (err, stdout) => {
      if (err) {
        return res.status(500).json({
          error: "Failed to get assigned port",
          details: err.message,
        });
      }

      const hostPort = stdout.trim().split(":").pop();

      return res.json({
        containerName,
        type,
        hostPort,
        running: true,
      });
    });
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
