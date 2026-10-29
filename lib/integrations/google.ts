import { google } from "googleapis";
import { googleConfigured, googleRedirectUri } from "../config";
import { loadGoogleTokens, saveGoogleTokens } from "./google-tokens";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.send",
];

export function oauthClient() {
  if (!googleConfigured()) throw new Error("Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET");
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, googleRedirectUri());
}

export function authUrl() {
  return oauthClient().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: GOOGLE_SCOPES });
}

export async function saveTokensFromCode(code: string) {
  const { tokens } = await oauthClient().getToken(code);
  return saveGoogleTokens(tokens);
}

export async function authorizedClient() {
  const client = oauthClient();
  const tokens = await loadGoogleTokens();
  if (!tokens) throw new Error("Google no está autorizado: abre /api/google/auth");
  client.setCredentials(tokens);
  client.on("tokens", (t) => {
    saveGoogleTokens(t).catch((e) => console.error("[google] no se pudo guardar el token", e));
  });
  return client;
}

export async function calendarApi() {
  return google.calendar({ version: "v3", auth: await authorizedClient() });
}

export async function gmailApi() {
  return google.gmail({ version: "v1", auth: await authorizedClient() });
}
