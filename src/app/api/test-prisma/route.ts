import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { prisma } = require("@/lib/prisma");
    const count = await prisma.user.count();
    return NextResponse.json({ success: true, count });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, stack: e.stack });
  }
}
