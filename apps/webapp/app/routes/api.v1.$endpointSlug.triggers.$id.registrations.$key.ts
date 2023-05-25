import type { ActionArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { RegisterTriggerBodySchema } from "@trigger.dev/internal";
import { z } from "zod";
import { authenticateApiRequest } from "~/services/apiAuth.server";
import { logger } from "~/services/logger";
import { RegisterTriggerSourceService } from "~/services/triggers/registerTriggerSource.server";

const ParamsSchema = z.object({
  endpointSlug: z.string(),
  id: z.string(),
  key: z.string(),
});

export async function action({ request, params }: ActionArgs) {
  logger.info("Registering trigger", { url: request.url });

  // Ensure this is a POST request
  if (request.method.toUpperCase() !== "PUT") {
    return { status: 405, body: "Method Not Allowed" };
  }

  const parsedParams = ParamsSchema.safeParse(params);

  if (!parsedParams.success) {
    logger.info("Invalid params", { params });

    return json({ error: "Invalid params" }, { status: 400 });
  }

  // Next authenticate the request
  const authenticatedEnv = await authenticateApiRequest(request);

  if (!authenticatedEnv) {
    logger.info("Invalid or missing api key", { url: request.url });

    return json({ error: "Invalid or Missing API key" }, { status: 401 });
  }

  // Now parse the request body
  const anyBody = await request.json();

  const body = RegisterTriggerBodySchema.safeParse(anyBody);

  if (!body.success) {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  const service = new RegisterTriggerSourceService();

  try {
    const registration = await service.call({
      environment: authenticatedEnv,
      payload: body.data,
      endpointSlug: parsedParams.data.endpointSlug,
      id: parsedParams.data.id,
      key: parsedParams.data.key,
    });

    return json(registration);
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error registering trigger", {
        url: request.url,
        error: error.message,
      });

      return json({ error: error.message }, { status: 400 });
    }

    return json({ error: "Something went wrong" }, { status: 500 });
  }
}