import e from "validator";
import { type RouterContext } from "oak";
import {
  EInvitationStatus,
  ProjectMemberModel,
} from "@Models/projectMember.ts";
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
  const { projectId, userId } = ctx.params;
  // const { userPayload } = ctx.state;
  const result = await ProjectMemberModel.findOne({
    projectId: new ObjectId(projectId),
    userId: new ObjectId(userId),
  });
  console.log(result);
  if (result && result.invitationStatus === EInvitationStatus.ACCEPTED) {
    throw new Error("This user is already one the members of the project.");
  }
  if (
    result &&
    [EInvitationStatus.PENDING, EInvitationStatus.REJECTED].includes(
      result.invitationStatus as EInvitationStatus,
    )
  ) {
    await ProjectMemberModel.deleteOneOrFail({ _id: result._id });
  }
  await next();
};
