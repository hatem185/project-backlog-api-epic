import e from "validator";
import { type RouterContext } from "oak";
import { ProjectMemberModel } from "@Models/projectMember.ts";
import { ObjectId } from "npm:mongodb@6.3.0";

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
  const membership = await ProjectMemberModel.findOne({
    _id: new ObjectId(ctx.params.id),
  });
  if (!membership) {
    throw new Error("Project Membership not found.");
  }
  const actorMembership = await ProjectMemberModel.findOne({
    userId: new ObjectId(userPayload.id as string),
    projectId: membership.projectId,
  });
  if (!actorMembership) {
    throw new Error("Project Membership for the actor not found");
  }
  ctx.state["membership"] = membership;
  ctx.state["actorMembership"] = actorMembership;
  // Continue to next middleware
  await next();
};
