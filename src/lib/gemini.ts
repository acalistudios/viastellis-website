/**
 * Gemini API proxy client.
 * All calls route through Supabase Edge Functions — the API key
 * never lives in the browser.
 *
 * The stella-chat Edge Function pipes Gemini's SSE stream straight through,
 * so the wire format is `data: {json}` lines where text chunks live at
 * candidates[0].content.parts[0].text.
 */

export interface StellaContext {
  chartData?: Record<string, unknown>
  persona?: 'stoic' | 'sassy' | 'warm'
  history?: Array<{ role: 'user' | 'model'; text: string }>
}

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api' // fallback for local dev

interface GeminiSseChunk {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
  }>
}

/**
 * Send a message to Stella and receive an async stream of text chunks.
 *
 * Usage:
 *   for await (const chunk of streamStella(msg, ctx, token)) {
 *     appendToMessage(chunk)
 *   }
 */
export async function* streamStella(
  userMessage: string,
  context: StellaContext,
  authToken: string
): AsyncGenerator<string> {
  const response = await fetch(`${PROXY_BASE}/stella-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ message: userMessage, context }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    if (error.code === 'CREDITS_EXHAUSTED') {
      throw new Error("You're out of credits for today. ✨ Come back tomorrow or upgrade for unlimited Stella time.")
    }
    throw new Error(error.error ?? error.message ?? `Stella is unavailable (${response.status}). Please try again.`)
  }

  if (!response.body) {
    throw new Error('No response stream from Stella proxy')
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += value

      // SSE events are separated by double newlines; process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // keep the last (possibly incomplete) line

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          const chunk: GeminiSseChunk = JSON.parse(payload)
          const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) yield text
        } catch {
          // Incomplete JSON in a single data line shouldn't happen with
          // alt=sse, but skip silently rather than crash the chat
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
