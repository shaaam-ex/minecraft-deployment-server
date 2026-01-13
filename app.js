import express from "express";
import { exec } from "child_process";

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
  const {
    containerName,
    image,
    internalPort,
    memory = "1g",
    cpus = "1",
    env = {},
  } = req.body;

  if (!containerName || !image || !internalPort) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const envArgs = Object.entries(env)
    .map(([key, value]) => `-e ${key}=${value}`)
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

      // Example output: 0.0.0.0:32768
      const hostPort = stdout.trim().split(":").pop();

      return res.json({
        containerName,
        hostPort,
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
