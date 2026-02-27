import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/swagger";

export async function GET() {
  const spec = getOpenApiSpec();
  return NextResponse.json(spec);
}
