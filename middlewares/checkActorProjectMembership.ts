import e from "validator";
import { type RouterContext } from "oak";
import { ObjectId } from "npm:mongodb@6.3.0";
import { ProjectMemberModel } from "@Models/projectMember.ts";

// If this is a global middleware, do not add arguments to the factory function.
export default () =>
async (ctx: RouterContext<string>, next: () => Promise<unknown>) => {
  // Query Validation (You can remove this validation if not required)
  // const Query =
  await e
    .object({}, { allowUnexpectedProps: true })
    .validate(Object.fromEntries(ctx.request.url.searchParams), {
      name: "query",
    });
  const { userPayload } = ctx.state;
  const actorMembership = await ProjectMemberModel.findOne({
    userId: new ObjectId(userPayload.id as string),
    projectId: new ObjectId(ctx.params.projectId),
  });
  if (!actorMembership) {
    throw new Error("You're not member in this project.");
  }
  ctx.state["actorMembership"] = actorMembership;
  // Continue to next middleware
  await next();
};
