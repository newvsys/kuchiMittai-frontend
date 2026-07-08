import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await params;
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
  }
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 86400 }, // cache for 24h
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch pincode data" }, { status: 502 });
  }
}
