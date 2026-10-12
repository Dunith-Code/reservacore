import { config } from "dotenv";

config({ path: ".env.test", override: true });

// Safety net: never run destructive tests against a non-test database.
const url = process.env.DATABASE_URL ?? "";
if (!/test/i.test(url.split("?")[0].split("/").pop() ?? "")) {
  throw new Error(`Refusing to run tests: DATABASE_URL must point to a *_test database (got "${url}")`);
}