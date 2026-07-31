import { setupServer } from "msw/node";
import { handlers } from "./handlers";
import http from "http";

const server = setupServer(...handlers);

server.listen({ onUnhandledRequest: "bypass" });

console.log("Mock server running on port 9898 (handles /api/v1/*)");
console.log("Press Ctrl+C to stop");
