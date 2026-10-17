// CHANGED by the Hype project on 2026-10-14: forwards the optional reasoning effort to the Responses API, and lets a user
// message carry images (input_text and input_image parts, images as data URLs).
// CHANGED by the Hype project on 2026-10-15: generateImage(), one image from a prompt and an optional sketch, with the
// Responses API's image_generation tool (a thumbnail drawn by the player, finished by the model).
// This file remains under the Sign-in with ChatGPT DevKit Noncommercial License v1.0 (see ../LICENSE).
import OpenAI from "openai";
import { apiError, ChatGPTError, isObject } from "./errors.js";
import type { GenerateImageOptions, ResponseInputMessage, ResponseInputPart, StreamResponseOptions } from "./types.js";

const validPart = (part: unknown): part is ResponseInputPart => isObject(part) && (
  (part.type === "input_text" && typeof part.text === "string")
  || (part.type === "input_image" && typeof part.image_url === "string" && /^data:image\/(png|jpeg|webp|gif);base64,/.test(part.image_url)
    && (part.detail === undefined || ["low", "high", "auto"].includes(String(part.detail)))));
const validContent = (message: ResponseInputMessage): boolean => typeof message.content === "string"
  || (message.role === "user" && Array.isArray(message.content) && message.content.length > 0 && message.content.every(validPart));

export async function streamResponse(
  accessToken: string,
  options: StreamResponseOptions,
  signal: AbortSignal,
): Promise<{ text: string }> {
  const input = typeof options.input === "string" ? [{ role: "user" as const, content: options.input }] : options.input;
  if (!Array.isArray(input) || input.some((message) =>
    !isObject(message) || !["user", "assistant", "developer"].includes(String(message.role)) || !validContent(message as ResponseInputMessage)
  )) {
    throw new ChatGPTError("invalid_request", "Use text messages with user, assistant, or developer roles (a user message may also carry input_image parts). Put system guidance in instructions.");
  }

  // The DevKit supplies the selected ChatGPT account's refreshed OAuth token.
  // Leave org/project unset; they are not placeholders for a Platform API account.
  const client = new OpenAI({
    apiKey: accessToken,
    baseURL: "https://api.openai.com/v1",
    organization: null,
    project: null,
    // Keep the SDK's default without inheriting OPENAI_LOG=debug, which can log clipboard text.
    logLevel: "warn",
    // Report ChatGPT sharing-limit errors immediately instead of retrying HTTP 429s.
    maxRetries: 0,
    // A redirect can forward the clipboard body to another origin.
    fetchOptions: { redirect: "error" },
    // Also prevent OPENAI_CUSTOM_HEADERS from replacing this account's credentials or tenant.
    defaultHeaders: {
      authorization: `Bearer ${accessToken}`,
      "openai-organization": null,
      "openai-project": null,
    },
  });
  // The SDK's timeout ends at headers; keep the existing deadline on the body too.
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(180_000)]);
  let response: Response | undefined;
  try {
    const result = await client.responses.create({
      model: options.model,
      input: input.map((message) => ({ role: message.role, content: message.content })),
      ...(options.instructions !== undefined ? { instructions: options.instructions } : {}),
      ...(options.reasoning ? { reasoning: { effort: options.reasoning.effort } } : {}),
      store: false,
      stream: true,
    }, { signal: requestSignal, headers: { accept: "text/event-stream" } }).withResponse();
    response = result.response;
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    // The direct route can return valid SSE without Content-Type. In that case,
    // validate the events below and still require response.completed for success.
    if (!response.body || (contentType && contentType !== "text/event-stream")) {
      await response.body?.cancel();
      throw new ChatGPTError("invalid_stream", "ChatGPT did not return the expected response stream.", true, response.status);
    }

    let completed = false;
    let text = "";
    for await (const event of result.data) {
      requestSignal.throwIfAborted();
      if (!isObject(event)) continue;
      if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
        text += event.delta;
        if (text.length > 16 * 1024 * 1024) throw new ChatGPTError("response_too_large", "The response was too large. Try a smaller request.");
        options.onDelta?.(event.delta);
      } else if (event.type === "response.failed" || event.type === "error") {
        const detail = event.type === "response.failed" ? event.response : event;
        throw apiError(detail, response.status, result.request_id);
      } else if (event.type === "response.incomplete") {
        throw new ChatGPTError("response_incomplete", "ChatGPT stopped before completing the response. You can keep the partial text or try again.", true);
      } else if (event.type === "response.completed") {
        completed = true;
        break;
      }
    }
    // The SDK may finish iteration on an aborted connection without throwing.
    requestSignal.throwIfAborted();
    if (!completed) throw new ChatGPTError("stream_interrupted", "The response ended before completion. You can keep the partial text or try again.", true);
    return { text };
  } catch (error) {
    if (signal.aborted) throw new ChatGPTError("cancelled", "The response was cancelled.");
    if (error instanceof ChatGPTError) throw error;
    // SDK errors can contain submitted text. Only expose our sanitized diagnostics,
    // including errors the SDK raises while decoding an SSE 'error' event.
    if (error instanceof OpenAI.APIError && !(error instanceof OpenAI.APIConnectionError) && !(error instanceof OpenAI.APIUserAbortError)) {
      // The SDK also unwraps the string in an OAuth { error: "code" } response.
      const detail = typeof error.error === "string" ? { error: error.error } : error.error;
      throw apiError(detail, error.status ?? response?.status, error.requestID ?? response?.headers.get("x-request-id"));
    }
    if (!response) throw new ChatGPTError("network_error", "Could not reach ChatGPT. Check your connection and try again.", true);
    if (error instanceof SyntaxError) throw new ChatGPTError("invalid_stream", "The response stream contained an invalid event. Try again.", true);
    throw new ChatGPTError("stream_interrupted", "The connection was interrupted. You can keep the partial text or try again.", true);
  }
}

// Hype (2026-10-15): one image from a prompt (and a sketch to follow), through the image_generation tool. Low quality and
// JPEG: fast enough for a game (the caller sets the deadline). Returns the image as base64, or throws like streamResponse.
export async function generateImage(
  accessToken: string,
  options: GenerateImageOptions,
  signal: AbortSignal,
): Promise<{ b64: string; format: string }> {
  const content: ResponseInputPart[] = [{ type: "input_text", text: options.prompt }];
  if (options.image && /^data:image\/(png|jpeg|webp);base64,/.test(options.image)) content.push({ type: "input_image", image_url: options.image, detail: "low" });
  const client = new OpenAI({
    apiKey: accessToken,
    baseURL: "https://api.openai.com/v1",
    organization: null,
    project: null,
    logLevel: "warn",
    maxRetries: 0,
    fetchOptions: { redirect: "error" },
    defaultHeaders: { authorization: `Bearer ${accessToken}`, "openai-organization": null, "openai-project": null },
  });
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(options.timeoutMs ?? 60_000)]);
  let response: Response | undefined;
  try {
    const result = await client.responses.create({
      model: options.model,
      input: [{ role: "user", content }],
      tools: [{ type: "image_generation", size: options.size ?? "1536x1024", quality: options.quality ?? "low", output_format: "jpeg", output_compression: 80 }],
      tool_choice: { type: "image_generation" },
      store: false,
      stream: true,
    } as any, { signal: requestSignal, headers: { accept: "text/event-stream" } }).withResponse();
    response = result.response;
    let b64 = "";
    for await (const event of result.data as AsyncIterable<unknown>) {
      requestSignal.throwIfAborted();
      if (!isObject(event)) continue;
      if (event.type === "response.output_item.done" && isObject(event.item) && event.item.type === "image_generation_call" && typeof event.item.result === "string") b64 = event.item.result;
      else if (event.type === "response.failed" || event.type === "error") throw apiError(event.type === "response.failed" ? event.response : event, response.status, result.request_id);
      else if (event.type === "response.completed") break;
    }
    requestSignal.throwIfAborted();
    if (!b64) throw new ChatGPTError("no_image", "ChatGPT did not return an image.", true);
    return { b64, format: "jpeg" };
  } catch (error) {
    if (signal.aborted) throw new ChatGPTError("cancelled", "The request was cancelled.");
    if (error instanceof ChatGPTError) throw error;
    if (error instanceof OpenAI.APIError && !(error instanceof OpenAI.APIConnectionError) && !(error instanceof OpenAI.APIUserAbortError)) {
      const detail = typeof error.error === "string" ? { error: error.error } : error.error;
      throw apiError(detail, error.status ?? response?.status, error.requestID ?? response?.headers.get("x-request-id"));
    }
    if (!response) throw new ChatGPTError("network_error", "Could not reach ChatGPT. Check your connection and try again.", true);
    throw new ChatGPTError("stream_interrupted", "The connection was interrupted. Try again.", true);
  }
}
