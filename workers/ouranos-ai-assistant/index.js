const ALLOWED_MODELS = new Set([
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
]);
const MAX_BODY_BYTES = 500000;
const MAX_BATCH_CHARS = 4200;
const MAX_FIELDS_PER_BATCH = 6;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_CHARS = 700;
const MAX_ESTIMATED_INPUT_TOKENS = 14000;
const MAX_FIELD_TEXT = 900;

const allowedOrigin = (origin) => origin === "https://ouranos-1b3.pages.dev" ||
  origin === "http://localhost:5173" ||
  Boolean(origin?.startsWith("https://") && origin.endsWith(".ouranos-1b3.pages.dev"));
const cors = (origin) => ({
  "Access-Control-Allow-Origin": allowedOrigin(origin) && origin ? origin : "https://ouranos-1b3.pages.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});
const json = (data, status, origin) => new Response(JSON.stringify(data), {
  status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});
const clip = (value, max = MAX_FIELD_TEXT) => {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return text.length > max ? text.slice(0, max) + "…（已压缩）" : text;
};
function compactExample(value, depth = 0) {
  if (depth > 3) return "…";
  if (typeof value === "string") return clip(value, 360);
  if (Array.isArray(value)) return value.slice(0, 12).map(item => compactExample(item, depth + 1));
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).slice(0, 16).map(([key, item]) => [key, compactExample(item, depth + 1)]));
  return value;
}
function compactSchema(schema, depth = 0) {
  if (depth > 7 || !schema || typeof schema !== "object") return {};
  const result = {};
  const scalarKeys = ["type", "title", "description", "required", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "minItems", "maxItems", "format", "pattern", "default", "prefill", "example", "placeholderValue", "editor", "nullable", "uniqueItems"];
  for (const key of scalarKeys) {
    if (schema[key] === undefined) continue;
    const value = schema[key];
    if (["title", "description", "placeholderValue"].includes(key)) result[key] = clip(value, key === "description" ? MAX_FIELD_TEXT : 180);
    else if (["default", "prefill", "example"].includes(key)) result[key] = compactExample(value);
    else if (key === "pattern") result[key] = clip(value, 900);
    else result[key] = value;
  }
  if (Array.isArray(schema.enum)) {
    const enumChars = JSON.stringify(schema.enum).length;
    if (schema.enum.length > 60 || enumChars > 1800) {
      result.enum = schema.enum.slice(0, 30);
      result.enum_truncated = true;
      result.enum_count = schema.enum.length;
    } else result.enum = schema.enum;
  }
  if (Array.isArray(schema.enumTitles)) result.enumTitles = schema.enumTitles.slice(0, 40).map(value => clip(value, 120));
  if (schema.items && typeof schema.items === "object") result.items = compactSchema(schema.items, depth + 1);
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") result.additionalProperties = compactSchema(schema.additionalProperties, depth + 1);
  for (const key of ["allOf", "anyOf", "oneOf"]) {
    if (Array.isArray(schema[key])) result[key] = schema[key].slice(0, 8).map(item => compactSchema(item, depth + 1));
  }
  if (schema.properties && typeof schema.properties === "object") {
    const entries = Object.entries(schema.properties);
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    const ordered = [...entries.filter(([key]) => required.has(key)), ...entries.filter(([key]) => !required.has(key))];
    // Never truncate root Actor inputs: all top-level fields are split into separate AI batches.
    // For deeply nested optional object properties, retain every required child and a generous optional sample.
    const limit = depth === 0 ? entries.length : Math.max(80, required.size);
    const kept = ordered.slice(0, limit);
    result.properties = Object.fromEntries(kept.map(([key, value]) => [key, compactSchema(value, depth + 1)]));
    if (kept.length < entries.length) result.properties_truncated_count = entries.length - kept.length;
  }
  return result;
}
function rejectUnknownKeys(value, schema, path = "actor_input") {
  if (Array.isArray(value)) return schema?.items ? value.flatMap((item, index) => rejectUnknownKeys(item, schema.items, path + "[" + index + "]")) : [];
  if (!value || typeof value !== "object" || !schema?.properties) return [];
  const errors = [];
  for (const [key, childValue] of Object.entries(value)) {
    const childSchema = schema.properties[key];
    if (!childSchema) { errors.push(path + "." + key + " 不存在于 Actor Schema"); continue; }
    errors.push(...rejectUnknownKeys(childValue, childSchema, path + "." + key));
  }
  return errors;
}
function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_HISTORY_ITEMS).map(item => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: clip(String(item?.content || ""), MAX_HISTORY_CHARS),
  }));
}
function buildBatches(properties) {
  const entries = Object.entries(properties || {});
  const batches = [];
  let current = [];
  let chars = 0;
  for (const [key, field] of entries) {
    const size = JSON.stringify({ [key]: field }).length;
    if (current.length && (current.length >= MAX_FIELDS_PER_BATCH || chars + size > MAX_BATCH_CHARS)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push([key, field]);
    chars += size;
  }
  if (current.length) batches.push(current);
  return batches;
}
function parseAiJson(result) {
  const responseText = typeof result?.response === "string" ? result.response : JSON.stringify(result?.response ?? result);
  try { return JSON.parse(responseText); }
  catch { throw new Error("AI_JSON_PARSE_ERROR"); }
}
function isContextLimitError(error) {
  return /5021|context window|tokens?.*(exceed|limit)|input.*too long|maximum.*tokens/i.test(String(error?.message || error));
}
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
async function runIntent(env, model, body, origin) {
  const platforms = Array.isArray(body.supported_platforms) ? body.supported_platforms.slice(0, 80) : [];
  const conversation = normalizeHistory(body.conversation);
  const system = [
    "你是 Ouranos 的业务需求接待助手。用简体中文理解用户目标，识别用户明确提到或可可靠推断的平台。",
    "platform_id 必须来自 supported_platforms；无法确定时返回 null。不要编造平台 ID。",
    "一次只问一个最重要的澄清问题。Actor 未选择前不生成 Actor 参数。提醒用户手动搜索并选择 Actor，之后根据该 Actor 的真实 Schema 继续确认。",
    "不得承诺平台不提供的隐私数据。只返回 JSON：{platform_id:string|null,assistant_message:string,summary:string,clarifying_question:string|null}。",
  ].join("\n");
  const input = {
    messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({
      user_request: clip(body.user_request || "", 3500), conversation,
      supported_platforms: platforms,
    }) }],
    response_format: { type: "json_object" }, max_tokens: 1100, temperature: 0.2,
  };
  const intent = parseAiJson(await env.AI.run(model, input));
  const requestedPlatform = String(intent.platform_id || "");
  const platformId = platforms.some(item => item.id === requestedPlatform) ? requestedPlatform : null;
  return json({ ok: true, mode: "intent", model, platform_id: platformId,
    assistant_message: clip(intent.assistant_message || "我已记录你的需求。请展开手动配置，选择平台和 Actor。", 1600),
    summary: clip(intent.summary || "", 700),
    clarifying_question: intent.clarifying_question ? clip(intent.clarifying_question, 500) : null,
  }, 200, origin);
}
const FIELD_SYSTEM = [
  "你是 Ouranos 的 Actor 参数配置顾问。你正在处理同一个 Actor Schema 的一个字段分组。",
  "用简体中文理解业务目标，根据字段 title、description、type、format、pattern、enum、default、prefill、example、required 和约束生成本组参数。",
  "用户不懂技术参数。对未知的关键字段只提出一个最重要的问题，不得猜 URL、关键词、地点、站点、日期或其他业务值。",
  "只生成本组 properties 中存在的字段；不允许生成 Schema 以外字段。枚举必须使用 Schema 原始值，严格遵循类型和约束。",
  "保留 previous_actor_input 中用户已确认且仍有效的值；本轮用户回答优先。Schema 默认值可使用，但要在 field_explanations 标明来源。",
  "可选字段如果无关或未提供可以省略，不要因此阻止提交。missing_information 只包含阻止正确执行的必填或关键业务信息。",
  "如果 Actor 能力与用户要找的数据类型不匹配，必须明确提醒，不得声称能获取其不支持的数据。",
  "只返回 JSON：{assistant_message:string,actor_input:object,missing_information:string[],field_explanations:object,warnings:string[]}。JSON 之外不要输出文字。",
].join("\n");
async function runFieldBatch(env, model, shared, schema, entries, depth = 0) {
  const properties = Object.fromEntries(entries);
  const required = (Array.isArray(schema.required) ? schema.required : []).filter(key => Object.hasOwn(properties, key));
  const batchSchema = { type: "object", required, properties };
  const previous = Object.fromEntries(Object.entries(shared.previous_actor_input || {}).filter(([key]) => Object.hasOwn(properties, key)));
  const inputContext = {
    user_request: shared.user_request,
    conversation: shared.conversation,
    market: shared.market,
    task_limits: shared.task_limits,
    channel: shared.channel,
    actor: shared.actor,
    previous_actor_input: previous,
    actor_schema: batchSchema,
  };
  const serialized = JSON.stringify(inputContext);
  const approxTokens = Math.ceil((FIELD_SYSTEM.length + serialized.length) / 1.6);
  if (approxTokens > MAX_ESTIMATED_INPUT_TOKENS && entries.length > 1) {
    const midpoint = Math.ceil(entries.length / 2);
    const left = await runFieldBatch(env, model, shared, schema, entries.slice(0, midpoint), depth + 1);
    const right = await runFieldBatch(env, model, shared, schema, entries.slice(midpoint), depth + 1);
    return mergeBatchResults(left, right);
  }
  if (approxTokens > MAX_ESTIMATED_INPUT_TOKENS) throw new Error("ACTOR_FIELD_TOO_LARGE");
  const maxTokens = Math.min(1800, Math.max(700, entries.length * 260));
  try {
    const result = await env.AI.run(model, {
      messages: [{ role: "system", content: FIELD_SYSTEM }, { role: "user", content: serialized }],
      response_format: { type: "json_object" }, max_tokens: maxTokens, temperature: 0.15,
    });
    const generated = parseAiJson(result);
    if (!isRecord(generated) || !isRecord(generated.actor_input)) throw new Error("AI_INVALID_FIELD_OUTPUT");
    const unknown = rejectUnknownKeys(generated.actor_input, batchSchema);
    if (unknown.length) throw new Error("AI_UNKNOWN_SCHEMA_FIELDS: " + unknown.join("; "));
    return {
      assistant_messages: generated.assistant_message ? [clip(generated.assistant_message, 900)] : [],
      actor_input: generated.actor_input,
      missing_information: Array.isArray(generated.missing_information) ? generated.missing_information.map(item => clip(item, 260)) : [],
      field_explanations: isRecord(generated.field_explanations) ? generated.field_explanations : {},
      warnings: Array.isArray(generated.warnings) ? generated.warnings.map(item => clip(item, 300)) : [],
    };
  } catch (error) {
    if (isContextLimitError(error) && entries.length > 1 && depth < 8) {
      const midpoint = Math.ceil(entries.length / 2);
      const left = await runFieldBatch(env, model, shared, schema, entries.slice(0, midpoint), depth + 1);
      const right = await runFieldBatch(env, model, shared, schema, entries.slice(midpoint), depth + 1);
      return mergeBatchResults(left, right);
    }
    if (isContextLimitError(error) && entries.length === 1 && depth < 8) {
      // Last-resort retry: keep the current field and its previous value, but reduce history and narrative context.
      const reduced = {
        ...shared,
        user_request: clip(shared.user_request, 1400),
        conversation: (shared.conversation || []).slice(-2).map(item => ({ ...item, content: clip(item.content, 380) })),
        actor: { ...shared.actor, description: clip(shared.actor?.description || "", 220) },
      };
      return runFieldBatch(env, model, reduced, schema, entries, depth + 1);
    }
    if (isContextLimitError(error)) throw new Error("AI_CONTEXT_BUDGET_EXCEEDED");
    throw error;
  }
}
function mergeBatchResults(left, right) {
  return {
    assistant_messages: [...(left.assistant_messages || []), ...(right.assistant_messages || [])],
    actor_input: { ...(left.actor_input || {}), ...(right.actor_input || {}) },
    missing_information: [...(left.missing_information || []), ...(right.missing_information || [])],
    field_explanations: { ...(left.field_explanations || {}), ...(right.field_explanations || {}) },
    warnings: [...(left.warnings || []), ...(right.warnings || [])],
  };
}
async function runConversation(env, model, body, origin) {
  const schema = body.actor_schema;
  if (!schema || !isRecord(schema.properties) || !Object.keys(schema.properties).length) {
    return json({ error: "未提供有效的 Actor 输入 Schema" }, 400, origin);
  }
  const compact = compactSchema(schema);
  const shared = {
    user_request: clip(body.user_request || "", 3500),
    conversation: normalizeHistory(body.conversation),
    previous_actor_input: isRecord(body.previous_actor_input) ? body.previous_actor_input : {},
    market: isRecord(body.market) ? body.market : {},
    task_limits: isRecord(body.task_limits) ? body.task_limits : {},
    channel: clip(body.channel || "", 80),
    actor: {
      id: clip(body.actor_id || "", 180),
      name: clip(body.actor_name || "", 220),
      description: clip(body.actor_description || "", 700),
    },
  };
  const batches = buildBatches(compact.properties);
  let combined = { assistant_messages: [], actor_input: {}, missing_information: [], field_explanations: {}, warnings: [] };
  for (const entries of batches) {
    const result = await runFieldBatch(env, model, shared, compact, entries);
    combined = mergeBatchResults(combined, result);
    // Make earlier generated values available to later groups for cross-field dependencies.
    shared.previous_actor_input = { ...(shared.previous_actor_input || {}), ...result.actor_input };
  }
  const unknown = rejectUnknownKeys(combined.actor_input, schema);
  if (unknown.length) return json({ error: "AI 生成了 Schema 不支持的字段，已阻止填入", details: unknown }, 422, origin);
  const missingRequired = (Array.isArray(schema.required) ? schema.required : []).filter(key => {
    const value = combined.actor_input[key];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });
  const missingInformation = [...new Set([
    ...combined.missing_information,
    ...missingRequired.map(key => {
      const field = schema.properties[key] || {};
      return String(field.title || key) + "（必填）：" + String(field.description || "请补充该参数的具体内容");
    }),
  ])].slice(0, 30);
  const assistantMessage = missingInformation.length
    ? "我已更新目前能够确定的参数。接下来请确认：" + missingInformation[0]
    : combined.assistant_messages[combined.assistant_messages.length - 1] || "参数已根据目前的需求更新。请检查预览。";
  return json({
    ok: true, mode: "conversation", model,
    assistant_message: assistantMessage,
    summary: clip("已结合 " + Object.keys(schema.properties).length + " 个 Schema 字段完成分组分析。", 300),
    strategy: "",
    actor_input: combined.actor_input,
    missing_information: missingInformation,
    field_explanations: combined.field_explanations,
    warnings: [...new Set(combined.warnings)].slice(0, 30),
    diagnostics: { schema_fields: Object.keys(schema.properties).length, batches: batches.length },
  }, 200, origin);
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
    if (!allowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, origin);
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer ")) return json({ error: "请先登录后再使用 AI 分析" }, 401, origin);
      const userResponse = await fetch(env.SUPABASE_URL + "/auth/v1/user", {
        headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: authorization },
        signal: AbortSignal.timeout(10000),
      });
      if (!userResponse.ok) return json({ error: "登录状态已失效，请重新登录" }, 401, origin);
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return json({ error: "请求内容过大，请缩短需求或精简 Schema" }, 413, origin);
      const body = JSON.parse(raw);
      const model = String(body.model || "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
      if (!ALLOWED_MODELS.has(model)) return json({ error: "所选 AI 模型不受支持，请从模型列表中重新选择" }, 400, origin);
      if (body.mode === "intent") {
        try { return await runIntent(env, model, body, origin); }
        catch (error) {
          if (error?.message === "AI_JSON_PARSE_ERROR") return json({ error: "AI 暂时无法理解这段需求，请换一种方式描述" }, 502, origin);
          throw error;
        }
      }
      try { return await runConversation(env, model, body, origin); }
      catch (error) {
        if (error?.message === "AI_CONTEXT_BUDGET_EXCEEDED" || error?.message === "ACTOR_FIELD_TOO_LARGE") {
          return json({ error: "这个 Actor 的单个参数定义仍然过大，已保护必填规则并停止生成。请尝试选择该 Actor 的简化输入模式，或缩短字段描述后重试。" }, 413, origin);
        }
        if (error?.message === "AI_JSON_PARSE_ERROR") return json({ error: "AI 返回内容格式异常，请重新发送这条消息。" }, 502, origin);
        if (String(error?.message || "").startsWith("AI_UNKNOWN_SCHEMA_FIELDS")) return json({ error: "AI 返回了 Schema 不支持的参数，已阻止提交。请重新发送消息。", details: String(error.message) }, 422, origin);
        throw error;
      }
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "AI 分析失败，请稍后重试" }, 500, origin);
    }
  },
};
