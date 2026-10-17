# Third-party material

Hype's own code is under the MIT licence (see `LICENSE`). The pieces below keep their own licences.

## In the desktop app (Hype pour ChatGPT)

| Component | Where | Licence |
| --- | --- | --- |
| **@siwc/local** — OpenAI's Sign in with ChatGPT SDK, from [sign-in-with-chatgpt-devkit](https://github.com/openai/sign-in-with-chatgpt-devkit) (commit `0a36fefe`, 2026-10-07) | `desktop/vendor/siwc-local` | **Sign-in with ChatGPT DevKit Noncommercial License v1.0** (`desktop/vendor/siwc-local/LICENSE`): non-commercial use only. Three files are changed and say so at their top. |
| ChatGPT marks (`chatgpt-black.svg`, `chatgpt-white.svg`), from the same DevKit | `desktop/assets/brand` | OpenAI trademarks: used only to identify the « Continuer avec ChatGPT » sign-in and the plan in use, under the [OpenAI brand guidelines](https://openai.com/brand/). No endorsement by OpenAI is implied. |
| [openai](https://github.com/openai/openai-node) (Node SDK, used by @siwc/local) | `desktop/node_modules` | Apache-2.0 |
| [jose](https://github.com/panva/jose) | `desktop/node_modules` | MIT |
| [proper-lockfile](https://github.com/moxystudio/node-proper-lockfile) | `desktop/node_modules` | MIT |
| [Electron](https://www.electronjs.org/) | the app itself | MIT (Chromium's licences ship with the app in `LICENSES.chromium.html`) |
| [htm + Preact](https://github.com/developit/htm) (`htm/preact/standalone`) | `desktop/renderer/vendor` | Apache-2.0 (htm), MIT (Preact) |
| Fonts [Onest](https://fonts.google.com/specimen/Onest), [Unbounded](https://fonts.google.com/specimen/Unbounded), [Martian Mono](https://fonts.google.com/specimen/Martian+Mono), via Fontsource | `desktop/renderer/fonts` | SIL Open Font License 1.1 (licence files next to the fonts) |

## In the Claude version (artifact)

The page loads htm + Preact from jsDelivr and the same three fonts from Google Fonts.
