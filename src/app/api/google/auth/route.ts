import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/services/googleService";
import { AccountType } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountType = (searchParams.get("type") as AccountType) || "work";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId === "seu_client_id.apps.googleusercontent.com") {
    // If OAuth is not configured with real client id, redirect with query param for interactive simulated connection
    return NextResponse.redirect(
      new URL(`/?google_oauth_missing=true&account_type=${accountType}`, req.url)
    );
  }

  const authUrl = getAuthUrl(accountType);
  return NextResponse.redirect(authUrl);
}

