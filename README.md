<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1l1pNncCexCwUrl73yoXN-Ja8MSCU4Dbp

## Run Locally

**Prerequisites:** Node.js, pnpm

1. Install dependencies:
   `pnpm install`
2. Set the `NEXT_PUBLIC_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (optional, current parser runs locally)
3. (Optional) Set `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` in [.env.local](.env.local) if you want Google Analytics tracking
4. Run the app:
   `pnpm dev`
