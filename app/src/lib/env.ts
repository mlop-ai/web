import { z } from "zod";

const envSchema = z.object({
  VITE_SERVER_URL: z.string().url(),
  VITE_ENV: z.enum(["development", "production", "test"]),
  VITE_IS_DOCKER: z.preprocess(
    (val) => val === "true",
    z.boolean().default(false),
  ),
});

// Validate environment variables
const parsedEnv = envSchema.safeParse(import.meta.env);

console.log("parsedEnv", parsedEnv);

if (!parsedEnv.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsedEnv.error.format(), null, 4),
  );
  throw new Error("Invalid environment variables");
}

// Export the validated environment variables
export const env = parsedEnv.data;
