// Pure helpers for OpenAI image generation (no I/O, so lib/imagegen.test.mjs can run them with node --test).
export const IMAGE_PROMPT_MAX = 4000;
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2.5-flare';
export const NO_KEY = 'OPENAI_API_KEY 가 없어 이미지를 만들 수 없어요. pocs/plan-doc/.env.local 에 넣고 서버를 다시 켜 주세요.';

/** Body for POST /v1/images/generations. GPT image models always answer in base64 and reject response_format/style. */
export function imageRequestBody(prompt: string, model: string) {
  // landscape for a plan doc; webp keeps the file under MAX_UPLOAD
  return { model, prompt, size: '1536x1024', output_format: 'webp' };
}

/** Image bytes from a generations response (data[0].b64_json), or null when there is none. */
export function imageFromResponse(data: unknown): Uint8Array | null {
  const b64 = (data as { data?: { b64_json?: unknown }[] } | null)?.data?.[0]?.b64_json;
  if (typeof b64 !== 'string' || !b64) return null;
  const bytes = Buffer.from(b64, 'base64');
  return bytes.length ? bytes : null;
}

/** Korean message for an OpenAI error response. The key never appears in it, even if OpenAI echoes it back. */
export function openaiError(status: number, data: unknown, key: string): string {
  const e = (data as { error?: { message?: unknown; code?: unknown } } | null)?.error;
  const raw = typeof e?.message === 'string' ? e.message : '';
  const msg = (key ? raw.split(key).join('***') : raw).replace(/\bsk-[\w*-]+/g, 'sk-***').replace(/\s+/g, ' ').trim().slice(0, 200);
  const head =
    status === 401 ? 'OpenAI API 키가 맞지 않아요. OPENAI_API_KEY 를 확인해 주세요.'
    : status === 403 ? '이 키로는 이 이미지 모델을 쓸 수 없어요. OpenAI 조직 인증이나 OPENAI_IMAGE_MODEL 을 확인해 주세요.'
    : status === 429 ? 'OpenAI 사용 한도에 걸렸어요. 잠시 뒤 다시 시도하거나 결제 한도를 확인해 주세요.'
    : status === 400 && (e?.code === 'moderation_blocked' || /safety|moderation|policy/i.test(raw)) ? '안전 정책에 걸려 이미지를 만들지 못했어요. 프롬프트를 고쳐 다시 시도해 주세요.'
    : status >= 500 ? 'OpenAI 쪽 오류로 이미지를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.'
    : 'OpenAI 가 요청을 거절했어요.';
  return msg ? `${head} (OpenAI: ${msg})` : head;
}

/** Name for an image when the user left it empty: the start of the prompt on one line. */
export const nameFromPrompt = (prompt: string) => prompt.replace(/\s+/g, ' ').trim().slice(0, 60).trim();

/** Prompt draft from the picked decisions: title and the start of each body, then the art instruction. Empty with no decisions. */
export function promptDraft(decisions: { title: string; body: string | null }[]): string {
  if (!decisions.length) return '';
  const lines = decisions.map((d) => {
    const body = (d.body ?? '')
      .replace(/결정\s*[:：]\s*/g, '')
      .replace(/(^|[.。]?\s*\n)\s*[-*+]\s+/g, (_m, nl: string) => (nl ? ', ' : '')) // list items read as one comma-separated sentence
      .replace(/[#*_`>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160)
      .trim();
    return body ? `${d.title}: ${body}` : d.title;
  });
  const tail = '\n\n위 게임 결정을 바탕으로 게임 기획서에 넣을 콘셉트 아트 한 장. 화면에 글자나 UI 없이 그림만.';
  return lines.join('\n').slice(0, IMAGE_PROMPT_MAX - tail.length) + tail;
}
