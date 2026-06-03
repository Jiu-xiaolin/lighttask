const { createLightTaskServer } = require("./server.cjs");

const port = Number(process.env.PORT || 4173);
const server = createLightTaskServer();

server.start(port).then(() => {
  console.log(`LightTask v12 running at ${server.url}`);
  setInterval(() => {}, 1000);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
