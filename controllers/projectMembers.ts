import {
  BaseController,
  Controller,
  Delete,
  Get,
  type IRequestContext,
  type IRoute,
  Patch,
  Post,
  Response,
  Versioned,
} from "@Core/common/mod.ts";
import { type RouterContext, Status } from "oak";
import e from "validator";
import { ObjectId } from "mongo";

import {
  EInvitationStatus,
  EProjectPermission,
  ProjectMemberModel,
  TProjectMemberOutput,
} from "@Models/projectMember.ts";
import checkAuth from "@Middlewares/checkAuth.ts";
import checkHasInvitation from "@Middlewares/checkHasInvitation.ts";
import { ProjectModel } from "@Models/project.ts";
import checkInvitationStatus from "@Middlewares/checkInvitationStatus.ts";
import checkActorProjectMembership from "@Middlewares/checkActorProjectMembership.ts";
import checkIsMembershipExist from "@Middlewares/checkIsMembershipExist.ts";

@Controller("/project/members/", {
  name: "projectMembers",
  middlewares: [checkAuth()],
})
export default class ProjectMembersController extends BaseController {
  @Post("/:projectId/send-invite/:userId/", {
    middlewares: [checkActorProjectMembership(), checkHasInvitation()],
  })
  public create(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({
      projectId: e.string(),
      userId: e.string(),
    });

    // Define Body Schema
    const BodySchema = e.object({});

    return new Versioned().add("1.0.0", {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
        body: BodySchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        // const Query =
        await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        // const Body =
        await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` },
        );
        const actorMembership = ctx.router.state
          .actorMembership as TProjectMemberOutput;
        if (actorMembership.permission !== EProjectPermission.ROOT) {
          throw new Error(
            "Send permission is not allowed for your project membership role.",
          );
        }
        const { userPayload } = ctx.router.state;
        const projectMember = await ProjectMemberModel.create({
          projectId: Params.projectId,
          userId: Params.userId,
          invitedById: userPayload.id,
        });
        return Response.statusCode(Status.Created)
          .message("New project invitation sent.")
          .data({
            projectMember,
          });
      },
    });
  }

  @Patch("/:id/permission/:permission", {
    middlewares: [checkIsMembershipExist()],
  })
  public updateMemeberPermission(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.string(),
      permission: e.enum(Object.values(EProjectPermission)),
    });

    // Define Body Schema
    const BodySchema = e.object({});

    return new Versioned().add("1.0.0", {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
        body: BodySchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        // const Query =
        await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        // const Body =
        await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` },
        );
        const actorMembership = ctx.router.state
          .actorMembership as TProjectMemberOutput;
        if (actorMembership.permission !== EProjectPermission.ROOT) {
          throw new Error(
            "Update member permissions is not allowed for your project membership permission.",
          );
        }
        const membership = ctx.router.state.membership as TProjectMemberOutput;
        const { modifications } = await ProjectMemberModel.updateOneOrFail(
          {
            _id: membership._id,
          },
          {
            permission: Params.permission,
          },
        );

        return Response.data(modifications);
      },
    });
  }
  @Patch("/:id/invitation-status/:invitationStatus", {
    middlewares: [checkInvitationStatus()],
  })
  public updateInvitationStatus(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.string(),
      invitationStatus: e.enum([
        EInvitationStatus.ACCEPTED,
        EInvitationStatus.REJECTED,
      ]),
    });

    // Define Body Schema
    const BodySchema = e.object({});

    return new Versioned().add("1.0.0", {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
        body: BodySchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        // const Query =
        await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        // const Body =
        await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` },
        );
        const { userPayload } = ctx.router.state;

        const { modifications } = await ProjectMemberModel.updateOneOrFail(
          {
            _id: new ObjectId(Params.id),
            userId: new ObjectId(userPayload.id as string),
          },
          {
            invitationStatus: Params.invitationStatus,
          },
        );

        return Response.data(modifications);
      },
    });
  }

  @Get("/my-memberships/:id?/", {
    middlewares: [checkHasInvitation()],
  })
  public getMyMembership(route: IRoute) {
    const CurrentTimestamp = Date.now();

    // Define Query Schema
    const QuerySchema = e.object(
      {
        search: e.optional(e.string()),
        range: e.optional(
          e.tuple([e.date().end(CurrentTimestamp), e.date()], { cast: true }),
        ),
        offset: e.optional(e.number({ cast: true }).min(0)).default(0),
        limit: e.optional(e.number({ cast: true }).max(2000)).default(2000),
        sort: e
          .optional(
            e.record(e.number({ cast: true }).min(-1).max(1), { cast: true }),
          )
          .default({ _id: -1 }),
        project: e.optional(
          e.record(e.number({ cast: true }).min(0).max(1), { cast: true }),
        ),
        includeTotalCount: e.optional(
          e
            .boolean({ cast: true })
            .describe(
              "If `true` is passed, the system will return a total items count for pagination purpose.",
            ),
        ),
        invitationStatus: e.optional(e.enum(Object.values(EInvitationStatus))),
      },
      { allowUnexpectedProps: true },
    );

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.optional(e.string()),
    });

    return Versioned.add("1.0.0", {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });
        const { userPayload } = ctx.router.state;
        const ProjectMembersBaseFilters = {
          ...(Query.range instanceof Array
            ? {
              createdAt: {
                $gt: new Date(Query.range[0]),
                $lt: new Date(Query.range[1]),
              },
            }
            : {}),
          ...(!Params.id
            ? { userId: new ObjectId(userPayload.id as string) }
            : {}),
          ...(Query.invitationStatus
            ? { invitationStatus: Query.invitationStatus }
            : {}),
        };

        const ProjectMembersListQuery = ProjectMemberModel.search(Query.search)
          .filter({
            ...(Params.id ? { _id: new ObjectId(Params.id) } : {}),
            ...ProjectMembersBaseFilters,
          })
          .skip(Query.offset)
          .limit(Query.limit)
          .sort(Query.sort)
          .populate("projectId", ProjectModel);
        if (Query.project) {
          Query.project["userId"] = 0;
          ProjectMembersListQuery.project(Query.project);
        } else {
          ProjectMembersListQuery.project({ userId: 0 });
        }

        return Response.data({
          totalCount: Query.includeTotalCount
            //? Make sure to pass any limiting conditions for count if needed.
            ? await ProjectMemberModel.count(ProjectMembersBaseFilters)
            : undefined,
          results: await ProjectMembersListQuery,
        });
      },
    });
  }
  @Get("/:id?/", { disabled: true })
  public get(route: IRoute) {
    const CurrentTimestamp = Date.now();

    // Define Query Schema
    const QuerySchema = e.object(
      {
        search: e.optional(e.string()),
        range: e.optional(
          e.tuple([e.date().end(CurrentTimestamp), e.date()], { cast: true }),
        ),
        offset: e.optional(e.number({ cast: true }).min(0)).default(0),
        limit: e.optional(e.number({ cast: true }).max(2000)).default(2000),
        sort: e
          .optional(
            e.record(e.number({ cast: true }).min(-1).max(1), { cast: true }),
          )
          .default({ _id: -1 }),
        project: e.optional(
          e.record(e.number({ cast: true }).min(0).max(1), { cast: true }),
        ),
        includeTotalCount: e.optional(
          e
            .boolean({ cast: true })
            .describe(
              "If `true` is passed, the system will return a total items count for pagination purpose.",
            ),
        ),
      },
      { allowUnexpectedProps: true },
    );

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.optional(e.string()),
    });

    return Versioned.add("1.0.0", {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        const ProjectMembersBaseFilters = {
          ...(Query.range instanceof Array
            ? {
              createdAt: {
                $gt: new Date(Query.range[0]),
                $lt: new Date(Query.range[1]),
              },
            }
            : {}),
        };

        const ProjectMembersListQuery = ProjectMemberModel.search(Query.search)
          .filter({
            ...(Params.id ? { _id: new ObjectId(Params.id) } : {}),
            ...ProjectMembersBaseFilters,
          })
          .skip(Query.offset)
          .limit(Query.limit)
          .sort(Query.sort);

        if (Query.project) ProjectMembersListQuery.project(Query.project);

        return Response.data({
          totalCount: Query.includeTotalCount
            //? Make sure to pass any limiting conditions for count if needed.
            ? await ProjectMemberModel.count(ProjectMembersBaseFilters)
            : undefined,
          results: await ProjectMembersListQuery,
        });
      },
    });
  }

  @Delete("/:id/", { middlewares: [checkIsMembershipExist()] })
  public delete(route: IRoute) {
    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.string(),
    });

    return Versioned.add("1.0.0", {
      shape: {
        params: ParamsSchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });
        const { _id: actorId, permission } = ctx.router.state
          .actorMembership as TProjectMemberOutput;
        const { _id: memberId } = ctx.router.state
          .membership as TProjectMemberOutput;
        if (
          permission !== EProjectPermission.ROOT &&
          !memberId.equals(actorId)
        ) {
          throw new Error(
            "Deleting membership is not allowed for your project membership permission.",
          );
        }
        await ProjectMemberModel.deleteOneOrFail(Params.id);

        return Response.true();
      },
    });
  }
}
