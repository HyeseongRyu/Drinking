import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { CATEGORIES } from './categories.js';

const MODEL = process.env.ANALYZE_MODEL || 'claude-opus-5';
const EFFORT = process.env.ANALYZE_EFFORT || 'low';

const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const AnalysisSchema = z.object({
  candidates: z
    .array(z.string())
    .describe('가능성이 높은 제품명 후보를 유력한 순서로 최대 4개. 짐작조차 어려우면 빈 배열'),
  category: z
    .enum(['beer', 'makgeolli', 'wine', 'whiskey', 'soju', 'other', 'unknown'])
    .describe('술 분류. 판단이 안 되면 unknown'),
  type: z.string().nullable().describe('종류/스타일. 예: 싱글몰트 위스키, 생막걸리, IPA'),
  abv: z.string().nullable().describe('도수. 예: "40%"'),
  origin: z.string().nullable().describe('생산 국가나 지역'),
  priceRange: z.string().nullable().describe('한국 소매 기준 대략적인 가격대. 예: "7만~9만원대"'),
  history: z.string().nullable().describe('브랜드나 술에 대한 간단한 역사/배경 1~2문장'),
  note: z.string().nullable().describe('추정했거나 확실하지 않은 부분에 대한 설명'),
});

const SYSTEM = [
  '당신은 술 사진을 보고 어떤 제품인지 알아보는 전문가입니다.',
  '라벨 글자뿐 아니라 병 모양, 색, 마개, 라벨 디자인까지 종합해서 판단하세요.',
  '라벨이 흐리거나 일부만 보여도 아는 범위에서 후보를 제시하세요.',
  '사용자가 적은 이름 힌트는 줄임말이거나 브랜드명 없이 제품 라인만 적은 조각일 수 있습니다.',
  '그럴 땐 그 조각을 포함하는 실제 제품의 정식 명칭으로 넓혀서 후보를 내세요.',
  '한국에 수입되지 않은 제품도 후보에 넣으세요.',
  '확실하지 않은 값은 null로 두고, 짐작한 부분은 note에 "추정"이라고 밝히세요.',
  '술이 아닌 사진이면 candidates를 빈 배열로, category를 unknown으로 두세요.',
  '없는 제품이나 사실이 아닌 도수·원산지를 지어내지 마세요. 모르면 null이 낫습니다.',
].join('\n');

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export function analyzeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function buildUserContent(imageBase64, mediaType, hint) {
  const lines = ['이 술 사진을 보고 어떤 제품인지 알려주세요.'];
  if (hint) lines.push(`사용자가 적은 이름 힌트: ${hint}`);
  lines.push(`분류는 다음 중 하나로 고르세요: ${Object.keys(CATEGORIES).join(', ')}, unknown`);

  return [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
    { type: 'text', text: lines.join('\n') },
  ];
}

/**
 * 사진 한 장으로 제품명 후보와 기본 정보를 추정한다.
 * 실패는 { error } 로 돌려주고 예외를 던지지 않는다 — 분석은 부가 기능이라
 * 실패해도 사용자가 직접 입력해 기록을 남길 수 있어야 한다.
 */
export async function analyzePhoto({ buffer, mimeType, hint }) {
  if (!analyzeConfigured()) {
    return { error: 'AI 분석이 설정되지 않았습니다. 서버에 ANTHROPIC_API_KEY를 설정해주세요.', status: 503 };
  }
  if (!SUPPORTED_MEDIA_TYPES.has(mimeType)) {
    return { error: 'JPEG, PNG, GIF, WebP 이미지만 분석할 수 있습니다.', status: 400 };
  }

  try {
    const response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      output_config: {
        format: zodOutputFormat(AnalysisSchema),
        effort: EFFORT,
      },
      messages: [{ role: 'user', content: buildUserContent(buffer.toString('base64'), mimeType, hint) }],
    });

    if (response.stop_reason === 'refusal') {
      return { error: 'AI가 이 사진의 분석을 거절했습니다.', status: 422 };
    }
    const parsed = response.parsed_output;
    if (!parsed) {
      return { error: '분석 결과를 해석하지 못했습니다. 다시 시도해주세요.', status: 502 };
    }

    return {
      result: {
        candidates: parsed.candidates.filter((c) => c && c.trim()).slice(0, 4),
        category: parsed.category === 'unknown' ? null : parsed.category,
        type: parsed.type,
        abv: parsed.abv,
        origin: parsed.origin,
        priceRange: parsed.priceRange,
        history: parsed.history,
        note: parsed.note,
      },
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { error: 'AI 인증에 실패했습니다. 서버의 API 키를 확인해주세요.', status: 503 };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { error: '요청이 많습니다. 잠시 후 다시 시도해주세요.', status: 429 };
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return { error: 'AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.', status: 503 };
    }
    if (err instanceof Anthropic.APIError) {
      console.error('analyze: API error', err.status, err.message);
      return { error: '분석 중 문제가 발생했습니다.', status: 502 };
    }
    console.error('analyze: unexpected error', err);
    return { error: '분석 중 문제가 발생했습니다.', status: 500 };
  }
}
