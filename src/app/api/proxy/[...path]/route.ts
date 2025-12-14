import { NextRequest, NextResponse } from "next/server";

const API_URLS = {
  testnet: "https://api-testnet.predict.fun",
  mainnet: "https://api.predict.fun",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${getBaseUrl(request)}/${pathString}${searchParams ? `?${searchParams}` : ""}`;

  const headers = buildHeaders(request);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proxy GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch from API" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const url = `${getBaseUrl(request)}/${pathString}`;

  const headers = buildHeaders(request);
  const body = await request.json();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proxy POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch from API" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const url = `${getBaseUrl(request)}/${pathString}`;

  const headers = buildHeaders(request);

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proxy DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch from API" },
      { status: 500 }
    );
  }
}

function getBaseUrl(request: NextRequest): string {
  const network = request.headers.get("x-network") || "testnet";
  return API_URLS[network as keyof typeof API_URLS] || API_URLS.testnet;
}

function buildHeaders(request: NextRequest): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Forward API key if present
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  // Forward Authorization if present
  const auth = request.headers.get("authorization");
  if (auth) {
    headers["Authorization"] = auth;
  }

  return headers;
}
