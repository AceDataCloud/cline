import { describe, expect, it } from "vitest";
import { createGateway } from "./gateway";

describe("Ace Data Cloud request transport", () => {
	it("sends only the selected model to the Ace Chat Completions endpoint", async () => {
		const requests: { url: string; authorization: string | null; body: any }[] =
			[];
		const localFetch = (async (input, init) => {
			requests.push({
				url: String(input),
				authorization: new Headers(init?.headers).get("authorization"),
				body: JSON.parse(String(init?.body)),
			});
			const chunk = {
				id: "fixture",
				object: "chat.completion.chunk",
				created: 1,
				model: "gpt-4.1",
				choices: [
					{
						index: 0,
						delta: { role: "assistant", content: "OK" },
						finish_reason: null,
					},
				],
			};
			const end = {
				...chunk,
				choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
				usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
			};
			return new Response(
				`data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(end)}\n\ndata: [DONE]\n\n`,
				{ headers: { "content-type": "text/event-stream" } },
			);
		}) as typeof fetch;
		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "acedatacloud",
					apiKey: "LOCAL_FIXTURE_ONLY",
					fetch: localFetch,
				},
			],
		});
		const model = gateway.createAgentModel({
			providerId: "acedatacloud",
			modelId: "gpt-4.1",
		});
		for await (const _event of await model.stream({
			messages: [
				{
					role: "user",
					content: [{ type: "text", text: "Reply OK" }],
					createdAt: 1,
				},
			],
			tools: [],
		})) {
			/* drain local fixture */
		}
		expect(requests).toHaveLength(1);
		expect(requests[0].url).toBe(
			"https://api.acedata.cloud/v1/chat/completions",
		);
		expect(requests[0].authorization).toBe("Bearer LOCAL_FIXTURE_ONLY");
		expect(requests[0].body.model).toBe("gpt-4.1");
	});
});
