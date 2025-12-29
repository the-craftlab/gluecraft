/**
 * JPD Webhook Receiver
 * 
 * This is a minimal serverless function (compatible with Cloudflare Workers / Vercel Edge)
 * that receives webhooks from Jira Product Discovery and triggers a GitHub Action.
 * 
 * Environment Variables required:
 * - GITHUB_TOKEN: Personal Access Token with repo scope
 * - GITHUB_OWNER: Owner of the repo where the Action lives
 * - GITHUB_REPO: Name of the repo where the Action lives
 * - JPD_WEBHOOK_SECRET: Secret to verify JPD webhook signature (optional but recommended)
 */

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // 1. Verify Secret (if JPD supports signing, verify header)
    // const signature = request.headers.get('X-Hub-Signature');
    // if (!verifySignature(signature, env.JPD_WEBHOOK_SECRET)) { ... }

    const payload = await request.json();

    // 2. Trigger GitHub Action
    const githubUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`;

    try {
      const response = await fetch(githubUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'JPD-Webhook-Receiver'
        },
        body: JSON.stringify({
          event_type: 'jpd-webhook',
          client_payload: payload // Pass JPD event data to the Action
        })
      });

      if (!response.ok) {
        return new Response(`GitHub API Error: ${response.statusText}`, { status: 502 });
      }

      return new Response('Sync Triggered', { status: 200 });
    } catch (e: any) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  }
};

