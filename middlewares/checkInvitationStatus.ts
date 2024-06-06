import e from "validator";
import { type RouterContext } from "oak";
import {
  EInvitationStatus,
  ProjectMemberModel,
} from "@Models/projectMember.ts";
import { ObjectId } from "npm:mongodb@6.3.0";
import { ProjectModel } from "@Models/project.ts";

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
  const { id } = ctx.params;
  const { userPayload } = ctx.state;
  const result = await ProjectMemberModel.findOne({
    _id: new ObjectId(id),
    userId: new ObjectId(userPayload.id as string),
  })
    .populate("projectId", ProjectModel)
    .project({ userId: 0 });
  if (!result) {
    throw new Error("You're not invited to this project.");
  }
  if (result.invitationStatus === EInvitationStatus.ACCEPTED) {
    throw new Error("You're already one the members of this project");
  }
  if (result.invitationStatus === EInvitationStatus.REJECTED) {
    throw new Error(
      "You reject this project invitation before, please ask for another invitation.",
    );
  }
  await next();
};
