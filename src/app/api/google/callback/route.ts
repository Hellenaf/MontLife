import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/services/googleService";
import { savePendingAuth } from "@/lib/pendingAuth";
import {
  findMasterUserByEmail,
  createOrUpdateMasterUser,
  linkEmailToMasterUser,
  getConnectedAccounts,
  saveConnectedAccount,
  consolidateHellenWorkspace,
  isHellenEmail,
  HELLEN_MASTER_ID,
  HELLEN_PRIMARY_EMAIL,
  HELLEN_LINKED_EMAILS,
} from "@/services/taskService";
import { getAppBaseUrl } from "@/lib/urlUtils";
import { setSessionCookie, getSessionUser, UserSession } from "@/lib/session";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const baseUrl = getAppBaseUrl(req);

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?oauth_error=no_code`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 1. Retrieve user details from Google OAuth (SSO)
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = (userInfo.data.email || "").toLowerCase().trim();
    const name = userInfo.data.name || email.split("@")[0] || "Usuário MontLife";
    const picture = userInfo.data.picture || "";
    const rawGoogleId = userInfo.data.id || email.replace(/[^a-z0-9_-]/g, "_");

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/?oauth_error=missing_email`);
    }

    // 2. Cross-Account Master Profile Recognition
    const activeSession = await getSessionUser(req);
    const isHellen = isHellenEmail(email) || (activeSession?.userId && isHellenEmail(activeSession.email));
    let masterUserId: string;

    if (isHellen) {
      masterUserId = HELLEN_MASTER_ID;
      await createOrUpdateMasterUser({
        id: HELLEN_MASTER_ID,
        primary_email: HELLEN_PRIMARY_EMAIL,
        linked_emails: [...HELLEN_LINKED_EMAILS],
        name: "Hellen Ferreira",
        picture: picture || undefined,
        role: "owner",
      });
      // Consolidate all demands from Notre Dame, Git, and Pessoal accounts
      consolidateHellenWorkspace(HELLEN_MASTER_ID).catch((err) =>
        console.warn("Background consolidation on login failed:", err)
      );
    } else if (activeSession?.userId) {
      // User is already authenticated and linking another account to their Master Profile
      masterUserId = activeSession.userId;
      await linkEmailToMasterUser(masterUserId, email);
    } else {
      // Check if any Master Profile contains this email
      const existingMaster = await findMasterUserByEmail(email);

      if (existingMaster) {
        masterUserId = existingMaster.id;
        await createOrUpdateMasterUser({
          id: masterUserId,
          primary_email: existingMaster.primary_email,
          linked_emails: [...(existingMaster.linked_emails || []), email],
          name: existingMaster.name || name,
          picture: existingMaster.picture || picture,
        });
      } else {
        // Brand new Master Profile
        masterUserId = `usr_${rawGoogleId}`;
        await createOrUpdateMasterUser({
          id: masterUserId,
          primary_email: email,
          linked_emails: [email],
          name,
          picture,
        });
      }
    }

    // Prepare unified session object
    const session: UserSession = {
      userId: masterUserId,
      email,
      name: isHellen ? "Hellen Ferreira" : name,
      picture,
      role: isHellen ? "owner" : "member",
      createdAt: new Date().toISOString(),
    };

    // 3. Check if account is already classified
    const existingAccounts = await getConnectedAccounts(masterUserId);
    const matchedAccount = existingAccounts.find(
      (a) => a.email.toLowerCase() === email && a.label
    );

    const accountId =
      matchedAccount?.id || `acc_${email.replace(/[^a-z0-9_-]/g, "_")}`;

    // If account was already classified in the past or belongs to Hellen
    if (isHellen || (matchedAccount && matchedAccount.label)) {
      const label =
        matchedAccount?.label ||
        (email.includes("notredame") ? "Trabalho (Notre Dame)" : "Pessoal");

      await saveConnectedAccount(
        {
          id: accountId,
          user_id: masterUserId,
          email,
          label,
          color: email.includes("notredame") ? "blue" : "purple",
          access_token: tokens.access_token || matchedAccount?.access_token,
          refresh_token: tokens.refresh_token || matchedAccount?.refresh_token,
          expiry_date: tokens.expiry_date || matchedAccount?.expiry_date,
          default_tasklist_id: "@default",
          last_sync_at: new Date().toISOString(),
          is_connected: true,
        },
        masterUserId
      );

      const redirectRes = NextResponse.redirect(
        `${baseUrl}/?login_success=true&email=${encodeURIComponent(email)}`
      );
      setSessionCookie(redirectRes, session);
      return redirectRes;
    }

    // 4. If account is NEW: Save pending auth and prompt categorization modal
    const ticketId = await savePendingAuth({
      userId: masterUserId,
      email,
      accountId,
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
      updated_at: new Date().toISOString(),
    });

    const redirectRes = NextResponse.redirect(
      `${baseUrl}/?prompt_classify=true&email=${encodeURIComponent(email)}&ticket=${ticketId}&acc_id=${encodeURIComponent(accountId)}`
    );
    setSessionCookie(redirectRes, session);
    return redirectRes;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/?oauth_error=token_exchange_failed`);
  }
}
