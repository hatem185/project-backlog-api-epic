import e, { inferInput, inferOutput } from "validator";
import { InputDocument, Mongo, ObjectId, OutputDocument } from "mongo";
import * as bcrypt from "bcrypt";
import { EInvitationStatus } from "@Models/projectMember.ts";

export const Key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);
export const UserSchema = () =>
  e.object({
    _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
    username: e.string().min(1).max(55),
    firstName: e.optional(e.string().min(1).max(75)),
    lastName: e.optional(e.string().min(1).max(75)),
    email: e.optional(e.string()),
    password: e.string(),
    invitations: e.optional(
      e.array(
        e.object({
          projectId: e.instanceOf(ObjectId, { instantiate: true }),
          invitedBy: e.instanceOf(ObjectId, { instantiate: true }), // Reference to inviting user
          status: e
            .optional(e.enum(Object.values(EInvitationStatus)))
            .default(EInvitationStatus.PENDING),
          createdAt: e.optional(e.date()).default(() => new Date()),
        }),
      ),
    ),
    createdAt: e.optional(e.date()).default(() => new Date()),
    updatedAt: e.optional(e.date()).default(() => new Date()),
  });

export type TUserInput = InputDocument<inferInput<typeof UserSchema>>;
export type TUserOutput = OutputDocument<inferOutput<typeof UserSchema>>;

export const UserModel = Mongo.model("user", UserSchema);

UserModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
UserModel.pre("create", async (details) => {
  details.data.password = await bcrypt.hash(
    details.data.password,
    await bcrypt.genSalt(10),
  );
  return details.data;
});
