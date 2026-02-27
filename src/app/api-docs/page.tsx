import { SwaggerUI } from "./swagger-ui";

export const metadata = {
  title: "API Docs | HappyRobot",
  description: "OpenAPI (Swagger) documentation for HappyRobot API",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SwaggerUI />
    </div>
  );
}
