import { z } from "zod";
import { handleApi } from "./api.ts";
import { ApiError, type Env } from "./types.ts";
import { MediaError } from "./media.ts";
import { checkOrigin, json, preflight, withCors } from "./http.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let response: Response;
    try {
      checkOrigin(request, env);
      response = request.method === "OPTIONS" ? preflight(request, env) : await handleApi(request, env);
    } catch (error) {
      if (error instanceof ApiError || error instanceof MediaError) response = json({ error: error.message }, error.status);
      else if (error instanceof z.ZodError) response = json({ error: error.issues[0]?.message || "请检查输入" }, 400);
      else {
        // Do not log request bodies, Authorization headers, application data or secrets.
        console.error("Backend operation failed", error instanceof Error ? error.name : "UnknownError");
        response = json({ error: "服务暂时无法完成操作，请稍后重试。" }, 503);
      }
    }
    return withCors(response, request, env);
  },
};
