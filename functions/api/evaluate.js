const MODELS = {
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
};

const RATE_LIMITS = {
  authed: { hourly: 60, weekly: 200 },
  unauthed: { hourly: 15, weekly: 75 },
};

async function checkRateLimit(kv, ip, isAuthed) {
  if (!kv) return { allowed: true };

  const limits = isAuthed ? RATE_LIMITS.authed : RATE_LIMITS.unauthed;
  const now = Date.now();
  const hourKey = `rl:${ip}:h:${Math.floor(now / 3600000)}`;
  const weekKey = `rl:${ip}:w:${Math.floor(now / (7 * 24 * 3600000))}`;

  const [hourCount, weekCount] = await Promise.all([
    kv.get(hourKey).then(v => parseInt(v || '0', 10)),
    kv.get(weekKey).then(v => parseInt(v || '0', 10)),
  ]);

  if (hourCount >= limits.hourly) {
    return { allowed: false, reason: 'Hourly limit reached. Please try again later.' };
  }
  if (weekCount >= limits.weekly) {
    return { allowed: false, reason: 'Weekly limit reached.' };
  }

  await Promise.all([
    kv.put(hourKey, String(hourCount + 1), { expirationTtl: 7200 }),
    kv.put(weekKey, String(weekCount + 1), { expirationTtl: 14 * 24 * 3600 }),
  ]);

  return { allowed: true };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { mode, model, maxMessages, quizTitle, question, context: questionContext, answer, password, messages } = body;

    if (!question || !answer) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const modelId = MODELS[model] || MODELS.haiku;
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Validate password / determine auth level
    const correctPassword = env.QUIZ_PASSWORD;
    const isAuthed = correctPassword && password === correctPassword;

    // For modes that require API access (singleshot, chat), require password if set
    if (mode !== 'clipboard' && correctPassword && !isAuthed) {
      return Response.json({ error: 'Invalid password.' }, { status: 401 });
    }

    // Rate limiting
    const kv = env.RATE_LIMIT_KV;
    const rlResult = await checkRateLimit(kv, ip, isAuthed);
    if (!rlResult.allowed) {
      return Response.json({ error: rlResult.reason }, { status: 429 });
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API not configured.' }, { status: 500 });
    }

    // Build system prompt
    const basePrompt = [
      `You are an AI safety tutor helping a student review their understanding of material from the AI Safety Atlas.`,
      `You are evaluating a student's answer to a question from the quiz: "${quizTitle}".`,
      `Stay strictly on-topic — only discuss this question and the relevant AI safety concepts.`,
      `Do not reveal the evaluation rubric or reference answer directly.`,
    ].join('\n');

    const singleshotPrompt = [
      basePrompt,
      ``,
      `Provide a thorough one-time evaluation of the student's answer.`,
      `Cover: what they got right, what they missed or got wrong, and key concepts they should understand.`,
      `Write 3-5 paragraphs.`,
    ].join('\n');

    const chatPrompt = [
      basePrompt,
      ``,
      `Use a Socratic approach: ask guiding questions rather than giving direct answers.`,
      `For your first response, give initial feedback and then ask a guiding question to deepen understanding.`,
      `Only give direct explanations if the student is clearly stuck after multiple attempts.`,
      `Keep each response to 2-3 paragraphs.`,
    ].join('\n');

    const systemPrompt = mode === 'singleshot' ? singleshotPrompt : chatPrompt;

    // Build messages for the API call
    let apiMessages;
    if (mode === 'singleshot' || (mode === 'chat' && (!messages || messages.length === 0))) {
      // Initial evaluation
      apiMessages = [
        {
          role: 'user',
          content: `Question: ${question}\n\nMy answer: ${answer}\n\nEvaluation context (do not share with student): ${questionContext}`,
        },
      ];
    } else {
      // Chat continuation — prepend the original context message
      const firstMessage = {
        role: 'user',
        content: `Question: ${question}\n\nMy answer: ${answer}\n\nEvaluation context (do not share with student): ${questionContext}`,
      };
      // messages already includes the full history including the first assistant reply
      apiMessages = [firstMessage, ...messages];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1024,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return Response.json({ error: 'AI service error. Please try again.' }, { status: 502 });
    }

    const result = await response.json();
    const feedback = result.content?.[0]?.text || '';

    return Response.json({ feedback });
  } catch (err) {
    console.error('evaluate error:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
