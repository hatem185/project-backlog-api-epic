import e, { inferInput, inferOutput } from "validator";
import { InputDocument, Mongo, ObjectId, OutputDocument } from "mongo";
export enum EProjectPermission {
  ROOT = "root",
  VIEW_ONLY = "view-only",
  EDIT = "edit",
}
export enum EInvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}
export const ProjectMemberSchema = () =>
  e.object({
    _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
    projectId: e.instanceOf(ObjectId, { instantiate: true }),
    userId: e.instanceOf(ObjectId, { instantiate: true }),
    invitedById: e.instanceOf(ObjectId, { instantiate: true }),
    permission: e
      .optional(e.enum(Object.values(EProjectPermission)))
      .default(EProjectPermission.VIEW_ONLY),
    invitationStatus: e
      .optional(e.enum(Object.values(EInvitationStatus)))
      .default(EInvitationStatus.PENDING),
    createdAt: e.optional(e.date()).default(() => new Date()),
    updatedAt: e.optional(e.date()).default(() => new Date()),
  });

export type TProjectMemberInput = InputDocument<
  inferInput<typeof ProjectMemberSchema>
>;
export type TProjectMemberOutput = OutputDocument<
  inferOutput<typeof ProjectMemberSchema>
>;

export const ProjectMemberModel = Mongo.model(
  "projectMember",
  ProjectMemberSchema,
);

ProjectMemberModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
