// deno-lint-ignore-file no-explicit-any
import type { Context } from "hono";
import type { H } from "hono/types";
import type { ObjectZod, Yelix, YelixValidationBase } from "@/mod.ts";
import type { OpenAPIDoc } from "@/src/OpenAPI/Core/index.ts";
import type { ApiReferenceOptions } from "@/src/OpenAPI/APIReferences/scalar.type.ts";

type Ctx = Context;

/** @deprecated ValidationType is deprecated because of type generation should be reactive. */
type ValidationType = {
  query?: Record<string, YelixValidationBase>;
  body?: ObjectZod<any>;
  formData?: Record<string, YelixValidationBase>;
};

type EndpointHandler = (ctx: Ctx) => Promise<any> | any;

type Endpoint = {
  path: string;
  GET?: EndpointHandler;
  POST?: EndpointHandler;
  PUT?: EndpointHandler;
  DELETE?: EndpointHandler;
  PATCH?: EndpointHandler;
  middlewares?: string[];
  validation?: unknown;
  openAPI?: OpenAPIDoc | undefined;
};

type ApplyMiddlewareParams = {
  ctx: Ctx;
  middleware: string;
  endpoint?: ParsedEndpoint;
};

type ParsedMethod = { method: string; handler: EndpointHandler };

type ExportsType = Record<string, any>;

type ParsedEndpoint = {
  middlewares: H[];
  path: string;
  methods: ParsedMethod[];
  exports: ExportsType;
  openAPI?: OpenAPIDoc;
};

type EnvironmentType = "dev" | "debug" | "prod" | "test";

/**
 * Represents the configuration settings for the application.
 *
 * @property environment - Specifies the application environment. Can be one of "dev", "debug", "prod", or "test".
 * @property serverPort - The port number on which the server will run.
 * @property showWelcomeMessage - Indicates whether to display a welcome message on startup.
 * @property includeDefaultMiddlewares - Determines if default middlewares should be included.
 * @property serveIndexPage - Specifies whether to serve the index page.
 */
type AppConfigType = {
  environment: EnvironmentType;
  serverPort: number;
  showWelcomeMessage: boolean;
  includeDefaultMiddlewares: boolean;
  serveIndexPage: boolean;
};

type OptionalAppConfigType = {
  [K in keyof AppConfigType]?: AppConfigType[K];
};

type Middleware = (
  request: ApplyMiddlewareParams,
  next: () => Promise<void>,
  yelix: Yelix,
) =>
  | Promise<Record<string, unknown>>
  | Record<string, unknown>
  | Promise<void>
  | void;

type MiddlewareList = {
  match: string | RegExp;
  middleware: Middleware;
};

type QueryType = Record<string, any>;

type CORSOptions = {
  origin:
    | string
    | string[]
    | ((origin: string, c: Context) => string | undefined | null);
  allowMethods?: string[];
  allowHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
  exposeHeaders?: string[];
};

type CORSParams = {
  affectRoute?: string;
} & CORSOptions;

type InitOpenAPIParams = {
  path?: string;
  title: string;
  version?: string;
  description?: string;
  servers?: { url: string; description?: string }[];
  apiReferenceConfig?: ApiReferenceOptions;
};

export type {
  AppConfigType,
  ApplyMiddlewareParams,
  CORSOptions,
  CORSParams,
  Ctx,
  Endpoint,
  EndpointHandler,
  EnvironmentType,
  ExportsType,
  InitOpenAPIParams,
  Middleware,
  MiddlewareList,
  OptionalAppConfigType,
  ParsedEndpoint,
  ParsedMethod,
  QueryType,
  ValidationType,
};
