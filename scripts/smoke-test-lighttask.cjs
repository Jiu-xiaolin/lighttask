const { createLightTaskServer } = require("../app/server.cjs");

async function main() {
  const server = createLightTaskServer({ dataDir: "app/.smoke-data" });
  await server.start(4180);
  try {
    const home = await fetch(`${server.url}/`);
    const login = await fetch(`${server.url}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    const loginData = await login.json();
    const dashboard = await fetch(`${server.url}/api/dashboard/summary`, {
      headers: { authorization: `Bearer ${loginData.token}` }
    });
    const dashboardData = await dashboard.json();
    console.log(JSON.stringify({
      url: server.url,
      homeStatus: home.status,
      loginStatus: login.status,
      user: loginData.user.name,
      todayActions: dashboardData.metrics.todayActions,
      activeProjects: dashboardData.metrics.activeProjects
    }, null, 2));
  } finally {
    await server.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
