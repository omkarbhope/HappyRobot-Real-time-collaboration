import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const definition = {
  openapi: "3.0.3",
  info: {
    title: "HappyRobot API",
    version: "1.0.0",
    description: "REST API for HappyRobot boards, tasks, comments, and real-time collaboration.",
  },
  servers: [
    { url: "/", description: "Current origin" },
  ],
  security: [{ sessionAuth: [] }],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "Session cookie from NextAuth sign-in. Use the app in a browser while signed in.",
      },
    },
  },
};

const options = {
  definition,
  apis: [path.join(process.cwd(), "src/lib/openapi-doc.ts")],
};

export function getOpenApiSpec(): Record<string, unknown> {
  return swaggerJsdoc(options) as Record<string, unknown>;
}
