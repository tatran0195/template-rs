const { setupServer } = require("msw/node");
const { handlers } = require("./mocks/handlers");

const server = setupServer(...handlers);
server.listen({ onUnhandledRequest: "bypass", quiet: true });
console.log("Mock test server running: http://localhost:9898/api/v1");
console.log("Routes covered:", handlers.length, "handlers");
console.log("Example: curl http://localhost:9898/api/v1/info");
