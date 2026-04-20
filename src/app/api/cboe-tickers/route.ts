import { NextResponse } from "next/server";
import data from "@/data/cboe-tickers.json";

export async function GET() {
  return NextResponse.json(data);
}
