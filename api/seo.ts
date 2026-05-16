// Single Vercel function that handles all /api/seo/* routes.
// We rewrite via vercel.json so this one file covers:
//   /api/seo/integrations           -> handle_integrations
//   /api/seo/integrations/test      -> handle_test
//   /api/seo/opportunities          -> handle_opportunities
//   /api/seo/tasks                  -> handle_tasks
//   /api/seo/briefs                 -> handle_briefs
//   /api/seo/workflow               -> handle_workflow
//   /api/seo/reports                -> handle_reports
//
// Why one function: Vercel's Hobby plan caps deployments at 12 serverless
// functions; the SEO module added 7 alone. Folding them into one handler
// keeps us well under the limit without changing the public URL shape.

import { json } from "../lib/validation.js";
import { handle_integrations } from "../lib/seo/integrations.js";
import { handle_test } from "../lib/seo/integrationsTest.js";
import { handle_opportunities } from "../lib/seo/opportunities.js";
import { handle_tasks } from "../lib/seo/tasks.js";
import { handle_briefs } from "../lib/seo/briefs.js";
import { handle_workflow } from "../lib/seo/workflow.js";
import { handle_reports } from "../lib/seo/reports.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // The Vercel rewrite forwards the captured sub-path in `_p`. We strip it
  // from the query before handing off so child handlers don't see it.
  const fromQuery = url.searchParams.get("_p");
  url.searchParams.delete("_p");
  const path = (fromQuery ?? url.pathname.replace(/^\/api\/seo\/?/, "")).replace(/\/+$/, "");
  const cleanedReq = new Request(url.toString(), req);

  switch (path) {
    case "":
    case "integrations":
      return handle_integrations(cleanedReq);
    case "integrations/test":
      return handle_test(cleanedReq);
    case "opportunities":
      return handle_opportunities(cleanedReq);
    case "tasks":
      return handle_tasks(cleanedReq);
    case "briefs":
      return handle_briefs(cleanedReq);
    case "workflow":
      return handle_workflow(cleanedReq);
    case "reports":
      return handle_reports(cleanedReq);
    default:
      return json({ error: { message: `unknown seo route: ${path}` } }, { status: 404 });
  }
}
