This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Local Facebook login with ngrok

Instagram OAuth needs an HTTPS redirect URI, so local dev runs behind an ngrok tunnel.

1. Install ngrok (`brew install ngrok`) and authenticate once: `ngrok config add-authtoken <token>`.
2. Start the app: `npm run dev`.
3. In another terminal, start the tunnel: `npm run tunnel` (forwards port 3000).
4. Copy the `https://…ngrok…` forwarding URL into `.env.local`:
   `FB_REDIRECT_URI=https://<domain>/api/auth/facebook/callback`
   Copy the other variables from `.env.example`.
5. Add the same redirect URI in the Meta app dashboard: Facebook Login for Business → Settings → Valid OAuth Redirect URIs.
6. Open the ngrok URL in the browser and click **Login with Facebook**. The Facebook user must manage a Page with an Instagram Business or Creator account linked.

Notes:
- Free ngrok URLs change on every restart. Update `FB_REDIRECT_URI` and the Meta dashboard each time, or use a reserved domain (`ngrok http 3000 --url=<your-domain>`).
- Free ngrok shows a one-time interstitial page on first visit. Click through it; the redirect still completes.
- Open the app through the ngrok URL, not `localhost`, or the OAuth redirect will not match.
