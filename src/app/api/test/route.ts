import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://api-testnet.predict.fun/v1/markets?limit=2");
    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "API test successful",
      apiResponseSuccess: data.success,
      marketCount: data.data?.length,
      firstMarketTitle: data.data?.[0]?.title,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
