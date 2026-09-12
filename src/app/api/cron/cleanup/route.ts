import { NextResponse } from "next/server";
import { cleanupExpiredCompletedOrders } from "@/app/actions/cleanup-actions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupExpiredCompletedOrders();
  return NextResponse.json(result);
}
