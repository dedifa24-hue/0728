import { NextRequest, NextResponse } from "next/server";

const TABLE = "lotto_draws";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function headers(key: string, extra?: HeadersInit) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

function validVisitorId(value: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function validNumbers(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length === 6
    && new Set(value).size === 6
    && value.every((number) => Number.isInteger(number) && number >= 1 && number <= 45);
}

export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();
  const visitorId = request.nextUrl.searchParams.get("visitorId");

  if (!config) {
    return NextResponse.json({ draws: [], configured: false });
  }
  if (!validVisitorId(visitorId)) {
    return NextResponse.json({ error: "유효하지 않은 방문자 ID입니다." }, { status: 400 });
  }

  const query = new URLSearchParams({
    select: "id,numbers",
    visitor_id: `eq.${visitorId}`,
    order: "created_at.desc",
    limit: "5",
  });
  const response = await fetch(`${config.url}/rest/v1/${TABLE}?${query}`, {
    headers: headers(config.key),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "최근 번호를 불러오지 못했습니다." }, { status: 502 });
  }

  return NextResponse.json({ draws: await response.json(), configured: true });
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ stored: false, configured: false }, { status: 202 });
  }

  const body = await request.json() as {
    visitorId?: string;
    numbers?: unknown;
    source?: string;
  };

  if (!validVisitorId(body.visitorId ?? null) || !validNumbers(body.numbers)) {
    return NextResponse.json({ error: "저장할 번호가 올바르지 않습니다." }, { status: 400 });
  }

  const response = await fetch(`${config.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: headers(config.key, {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify({
      visitor_id: body.visitorId,
      numbers: [...body.numbers].sort((a, b) => a - b),
      source: body.source === "fortune" ? "fortune" : "random",
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "번호를 저장하지 못했습니다." }, { status: 502 });
  }

  return NextResponse.json({ stored: true });
}

export async function DELETE(request: NextRequest) {
  const config = getSupabaseConfig();
  const visitorId = request.nextUrl.searchParams.get("visitorId");

  if (!config) return NextResponse.json({ deleted: false, configured: false });
  if (!validVisitorId(visitorId)) {
    return NextResponse.json({ error: "유효하지 않은 방문자 ID입니다." }, { status: 400 });
  }

  const response = await fetch(
    `${config.url}/rest/v1/${TABLE}?visitor_id=eq.${encodeURIComponent(visitorId!)}`,
    {
      method: "DELETE",
      headers: headers(config.key, { Prefer: "return=minimal" }),
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "기록을 삭제하지 못했습니다." }, { status: 502 });
  }

  return NextResponse.json({ deleted: true });
}
