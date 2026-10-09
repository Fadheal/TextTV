import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";

const allowedContentTypes = ["video/mp4", "video/webm", "video/quicktime"];
const maxVideoSize = 500 * 1024 * 1024;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return Response.json(
      { error: "Video upload is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (clientPayload !== adminPin) {
          throw new Error("Unauthorized video upload.");
        }

        return {
          allowedContentTypes,
          maximumSizeInBytes: maxVideoSize,
          addRandomSuffix: true,
        };
      },
    });

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Video upload request failed.";
    const status = message.includes("Unauthorized") ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
