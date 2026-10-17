# @siwc/local (vendored)

Local Node.js SDK for **Sign in with ChatGPT**, copied from OpenAI's
[sign-in-with-chatgpt-devkit](https://github.com/openai/sign-in-with-chatgpt-devkit)
(`packages/local`, commit `0a36fefeb913055c8c7a1a29b63d82b96b2e841a`, 2026-10-07).

It is **not** under Hype's MIT licence: it stays under the
[Sign-in with ChatGPT DevKit Noncommercial License v1.0](LICENSE), which allows
non-commercial use only. Hype is a free, non-commercial game.

Changed files (each one starts with a change notice):

- `src/types.ts` — optional `reasoning` field in `StreamResponseOptions`.
- `src/responses.ts` — forwards that reasoning effort to the Responses API.
- `src/oauth.ts` — the browser page shown after sign-in is in French.
- `src/responses.ts`, `src/types.ts`, `src/index.ts` — `generateImage()`: one image from a prompt and a sketch, with the
  Responses API's image_generation tool (a thumbnail the player drew, finished by the model).

`dist/` is generated from `src/` by `npm run build:sdk` (esbuild, no bundling).
