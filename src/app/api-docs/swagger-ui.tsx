"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Swagger UI component loaded client-side to avoid SSR issues
const SwaggerUIBundle = dynamic(
  () => import("swagger-ui-react").then((mod) => mod.default),
  { ssr: false }
);

export function SwaggerUI() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/openapi")
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch(() => setSpec(null));
  }, []);

  if (!spec) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-muted-foreground">Loading API documentation…</p>
      </div>
    );
  }

  return (
    <div className="swagger-wrap">
      <SwaggerUIBundle spec={spec} />
    </div>
  );
}
