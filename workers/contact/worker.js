export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(env),
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const data = await request.json();
      const { name, email, service, message } = data;

      if (!name || !email || !service || !message) {
        return new Response(
          JSON.stringify({ error: "全ての項目を入力してください" }),
          { status: 400, headers: corsHeaders(env) }
        );
      }

      const slackPayload = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📩 新しいお問い合わせ",
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*お名前:*\n${name}` },
              { type: "mrkdwn", text: `*メール:*\n${email}` },
            ],
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*ご相談内容:*\n${service}` },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*メッセージ:*\n${message}`,
            },
          },
        ],
      };

      const [slackResponse] = await Promise.all([
        fetch(env.SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackPayload),
        }),
        fetch(env.ORBIT_HUB_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, service, message }),
        }).catch((err) => { console.error("Orbit Hub send failed:", err); return null; }),
      ]);

      if (!slackResponse.ok) {
        return new Response(
          JSON.stringify({ error: "送信に失敗しました" }),
          { status: 500, headers: corsHeaders(env) }
        );
      }

      return new Response(
        JSON.stringify({ message: "送信しました" }),
        { status: 200, headers: corsHeaders(env) }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: corsHeaders(env) }
      );
    }
  },
};

function corsHeaders(env) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "https://www.obt-llc.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
