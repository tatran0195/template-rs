import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Node-side server for vitest — exercises the exact same handlers as the browser worker. */
export const server = setupServer(...handlers);
