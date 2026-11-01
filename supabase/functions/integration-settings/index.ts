import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function cors(origin: string | null) {
  const allowed = origin === "https://ouranos-1b3.pages.dev"
    || (origin?.startsWith("https://") === true && origin.endsWith(".ouranos-1b3.pages.dev"));
  return {
    ...corsHeaders,
    ...(allowed && origin ? { "Access-Control-Allow-Origin": origin } : {}),
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

function serviceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  return keys.default as string | undefined;
}

function publishableKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  return keys.default as string | undefined;
}

async function rest(path: string, key: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("Supabase URL is not configured");
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  headers.set("Content-Type", "application/json");
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers });
}

function safeConfig(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const allowed = ["base_url", "actor_id", "dataset_id", "region", "workspace", "api_endpoint", "options"];
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined && typeof value !== "string" && (typeof value !== "object" || value === null)) continue;
    if (value !== undefined) result[key] = value;
  }
  return result;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  try {
    const authorization = req.headers.get("authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = publishableKey();
    const adminKey = serviceKey();
    if (!authorization || !token || !url || !anonKey || !adminKey) {
      return json({ error: "Authentication or server configuration is missing" }, 401, origin);
    }

    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!userResponse.ok) return json({ error: "Invalid or expired session" }, 401, origin);
    const user = await userResponse.json();

    const body = await req.json();
    const workspaceId = String(body.workspace_id ?? "");
    const kind = body.kind === "ai_model" ? "ai_model" : body.kind === "data_source" ? "data_source" : "";
    const providerKey = String(body.provider_key ?? "").toLowerCase();
    const providerName = String(body.provider_name ?? "").trim();
    const apiKey = String(body.api_key ?? "");
    const modelName = String(body.model_name ?? "").trim();
    if (!workspaceId || !kind || !/^[a-z0-9-]{2,64}$/.test(providerKey) || !providerName || apiKey.trim().length < 8 || apiKey.length > 8192) {
      return json({ error: "Invalid integration configuration" }, 400, origin);
    }
    if (kind === "ai_model" && !modelName) return json({ error: "Model name is required" }, 400, origin);

    const membership = await rest(
      `workspace_members?select=role&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      adminKey,
    );
    if (!membership.ok) return json({ error: "Unable to verify workspace access" }, 500, origin);
    const members = await membership.json();
    let isOwner = false;
    if (!members.length) {
      const ownerCheck = await rest(
        `workspaces?select=id&owner_id=eq.${encodeURIComponent(user.id)}&id=eq.${encodeURIComponent(workspaceId)}&limit=1`,
        adminKey,
      );
      if (ownerCheck.ok) isOwner = (await ownerCheck.json()).length > 0;
    }
    if (!members.length && !isOwner) return json({ error: "Workspace access denied" }, 403, origin);

    const table = kind === "data_source" ? "integration_connections" : "ai_model_configs";
    const filter = `workspace_id=eq.${encodeURIComponent(workspaceId)}&provider_key=eq.${encodeURIComponent(providerKey)}`
      + (kind === "ai_model" ? `&model_name=eq.${encodeURIComponent(modelName)}` : "");
    const existingResponse = await rest(`${table}?select=id,secret_ref&${filter}&limit=1`, adminKey);
    if (!existingResponse.ok) return json({ error: "Unable to read current integration" }, 500, origin);
    const existingRows = await existingResponse.json();
    const existing = existingRows[0];

    const secretName = `ouranos_${workspaceId}_${providerKey}${kind === "ai_model" ? "_" + modelName.replace(/[^a-zA-Z0-9_-]/g, "_") : ""}`;
    const secretDescription = `Ouranos ${kind} credential for ${providerName} in workspace ${workspaceId}`;
    const rpcName = existing?.secret_ref ? "integration_secret_update" : "integration_secret_create";
    const rpcBody = existing?.secret_ref
      ? { p_secret_id: existing.secret_ref, p_secret: apiKey, p_name: secretName, p_description: secretDescription }
      : { p_secret: apiKey, p_name: secretName, p_description: secretDescription };
    const secretResponse = await rest(`rpc/${rpcName}`, adminKey, { method: "POST", body: JSON.stringify(rpcBody) });
    if (!secretResponse.ok) {
      const message = await secretResponse.text();
      return json({ error: "Secure credential storage failed", detail: message.slice(0, 240) }, 500, origin);
    }
    const secretRef = existing?.secret_ref ?? await secretResponse.json();

    const payload: Record<string, unknown> = {
      workspace_id: workspaceId,
      provider_key: providerKey,
      provider_name: providerName,
      secret_ref: secretRef,
      status: "configured",
      is_enabled: false,
      last_error: null,
      last_tested_at: null,
      updated_at: new Date().toISOString(),
    };
    if (kind === "data_source") {
      payload.category = ["data_source", "automation", "website_crawling", "ecommerce", "other"].includes(body.category) ? body.category : "other";
      payload.config = safeConfig(body.config);
    } else {
      payload.model_name = modelName;
      payload.base_url = typeof body.base_url === "string" ? body.base_url.slice(0, 500) : null;
      payload.options = safeConfig(body.options);
      payload.is_default = body.is_default === true;
      if (payload.is_default) {
        await rest(`ai_model_configs?workspace_id=eq.${encodeURIComponent(workspaceId)}&is_default=eq.true`, adminKey, {
          method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_default: false, updated_at: new Date().toISOString() }),
        });
      }
    }

    const conflict = kind === "data_source" ? "workspace_id,provider_key" : "workspace_id,provider_key,model_name";
    const saveResponse = await rest(`${table}?on_conflict=${conflict}`, adminKey, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    });
    if (!saveResponse.ok) {
      return json({ error: "Credential saved, but integration metadata could not be updated" }, 500, origin);
    }
    return json({ ok: true, kind, provider_key: providerKey, status: "configured", enabled: false, credential_stored: true }, 200, origin);
  } catch (_error) {
    return json({ error: "Unexpected integration settings error" }, 500, origin);
  }
});
