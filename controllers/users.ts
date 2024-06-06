import {
  BaseController,
  Controller,
  Get,
  type IRequestContext,
  type IRoute,
  Post,
  Response,
} from "@Core/common/mod.ts";
import { type RouterContext, Status } from "oak";
import e from "validator";
import { Key, UserModel } from "@Models/user.ts";
import { create, getNumericDate } from "djwt";
import { compare } from "bcrypt";
import checkAuth from "@Middlewares/checkAuth.ts";

@Controller("/users/", { name: "users" })
export default class UsersController extends BaseController {
  @Post("/signup")
  public signup(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({});

    // Define Body Schema
    const BodySchema = e
      .object({
        username: e
          .string()
          .min(1)
          .max(55)
          .custom(async ({ output }) => {
            const userExist = await UserModel.exists({ username: output });
            if (userExist) {
              throw new Error(`User ${output} already exists.`);
            }
            return output;
          }),
        firstName: e.optional(e.string().min(1).max(75)),
        lastName: e.optional(e.string().min(1).max(75)),
        email: e.optional(
          e.string().custom(({ output }) => {
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output)) {
              return output;
            }
            throw new Error("Invalid Email Value.");
          }),
        ),
        password: e.string().custom((ctx) => {
          const password = ctx.output;
          if (password.length < 8) {
            throw Error("Password must be at least 8 characters long");
          }
          // Character variety checks
          if (!/[A-Z]/.test(password)) {
            throw Error("Password must contain at least one uppercase letter");
          }

          // Character variety checks
          if (!/[a-z]/.test(password)) {
            throw Error("Password must contain at least one lowercase letter");
          }
          return ctx.output;
        }),
        passwordConfirm: e.string(),
      })
      .custom(({ output }) => {
        const { password, passwordConfirm } = output;
        if (password !== passwordConfirm) {
          throw new Error(
            "Password Confirmation does not match the provided password.",
          );
        }
        return output;
      });

    return {
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
        // const Params =
        await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` },
        );

        const user = await UserModel.create({
          username: Body.username,
          password: Body.password,
          firstName: Body.firstName,
          lastName: Body.lastName,
          email: Body.email,
        });
        if (!user._id) {
          return Response.statusCode(Status.BadRequest).message(
            "Failed to create a user.",
          );
        }
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        user.password = "";
        const jwt = await create(
          { alg: "HS512", typ: "JWT" },
          {
            id: user._id,
            username: user.username,
            exp: getNumericDate(date),
          },
          Key,
        );
        ctx.router.cookies.set("jwt", jwt, { expires: date });
        return Response.statusCode(Status.Created)
          .data({
            token: jwt,
            user,
          })
          .message("Sign up successfully.");
      },
    };
  }

  @Post("/login")
  public login(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({});

    // Define Body Schema
    const BodySchema = e.object({
      username: e.string(),
      password: e.string(),
    });
    return {
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
        // const Params =
        await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` },
        );

        const user = await UserModel.findOne({
          username: Body.username,
        });

        if (!user?._id) {
          throw new Error("User with given username not found.");
        }

        const isMathchPassword = await compare(Body.password, user.password);
        if (!isMathchPassword) {
          throw new Error("Wrong password provided, please try again.");
        }
        user.password = "";
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        const jwt = await create(
          { alg: "HS512", typ: "JWT" },
          {
            id: user._id,
            username: user.username,
            exp: getNumericDate(date),
          },
          Key,
        );
        ctx.router.cookies.set("jwt", jwt, { expires: date });
        return Response.status(true)
          .statusCode(Status.Created)
          .data({
            token: jwt,
            user,
          })
          .message("Logged in successfully.");
      },
    };
  }

  @Get("/info", {
    middlewares: [checkAuth()],
  })
  public info(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({});

    return {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        // const Query =
        await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        // Params Validation
        // const Params =
        await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        const { userPayload } = ctx.router.state;
        const user = await UserModel.findOne({
          id: userPayload._id,
        });
        if (!user?._id) {
          throw new Error("User not found.");
        }
        user.password = "";
        return Response.status(true)
          .statusCode(Status.OK)
          .message("User info fetched successfully.")
          .data(user);
      },
    };
  }
  @Get("/")
  public list(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({});

    return {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        // const Query =
        await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        // Params Validation
        // const Params =
        await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Start coding here...

        return Response.status(true);
      },
    };
  }
}
