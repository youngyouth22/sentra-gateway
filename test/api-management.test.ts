
import { test } from "node:test";
import assert from "node:assert";
import fastify from "fastify";
import appPlugin from "../src/app.js";

test("API Management and Protection Flow", async (t) => {
  const server = fastify();
  await server.register(appPlugin);
  await server.ready();

  let rawApiKey: string = "";
  let apiKeyId: string = "";

  await t.test("POST /v1/api-keys should fail without auth", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/api-keys",
      payload: { name: "Test Key" },
    });
    assert.strictEqual(response.statusCode, 401);
  });

  await t.test("POST /v1/api-keys should succeed with test UID", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/api-keys",
      headers: { "x-test-uid": "user123" },
      payload: { name: "Test Key" },
    });
    assert.strictEqual(response.statusCode, 201);
    const body = JSON.parse(response.payload);
    assert.ok(body.rawKey.startsWith("sentra_"));
    rawApiKey = body.rawKey;
    apiKeyId = body.id;
  });

  await t.test("GET /v1/trust/evaluate should fail without API key", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/trust/evaluate",
      payload: { phoneNumber: "+1234567890" },
    });
    assert.strictEqual(response.statusCode, 401);
  });

  await t.test("GET /v1/trust/evaluate should succeed with valid API key", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/trust/evaluate",
      headers: { "x-api-key": rawApiKey },
      payload: { phoneNumber: "+1234567890" },
    });
    assert.strictEqual(response.statusCode, 200);
  });

  await t.test("GET /v1/analytics/usage should show stats", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/v1/analytics/usage",
      headers: { "x-test-uid": "user123" },
    });
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.ok(body.totalRequests >= 1);
  });

  await t.test("DELETE /v1/api-keys/:id should revoke key", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/v1/api-keys/${apiKeyId}`,
      headers: { "x-test-uid": "user123" },
    });
    assert.strictEqual(response.statusCode, 204);

    const checkResponse = await server.inject({
      method: "POST",
      url: "/v1/trust/evaluate",
      headers: { "x-api-key": rawApiKey },
      payload: { phoneNumber: "+1234567890" },
    });
    assert.strictEqual(checkResponse.statusCode, 401);
  });

  await server.close();
});
