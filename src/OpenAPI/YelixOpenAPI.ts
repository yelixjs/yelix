// deno-lint-ignore-file no-explicit-any
import type { OpenAPI, OpenAPIDefaultSchema } from "./Core/index.ts";
import type { NewEndpointParams, OpenAPIParams } from "./Core/index.ts";
import { inp, YelixValidationBase } from "@/mod.ts";

class YelixOpenAPI {
  _openAPI: OpenAPI | null = null;
  private customValidationDescriptions: Record<string, (_: any) => string> = {};

  constructor(params: OpenAPIParams) {
    this._openAPI = {
      openapi: "3.1.0",
      info: {
        title: params.title,
        version: params.version,
        description: params.description || "Yelix API Documentation",
      },
      paths: {},
      servers: params.servers || [],
    };
  }

  /**
   * Registers a custom validation rule description for a specific kind.
   * If a description for the given kind already exists, it will be overridden.
   *
   * @param kind - The type of validation rule to describe.
   * @param fn - A function that takes any input and returns a string describing the validation rule.
   * @returns A boolean indicating whether an existing description was overridden (`true`) or not (`false`).
   */
  describeValidationRule(kind: string, fn: (_: any) => string): boolean {
    let isOverriding = false;

    if (this.customValidationDescriptions[kind]) {
      isOverriding = true;
    }

    this.customValidationDescriptions[kind] = fn;
    return isOverriding;
  }

  getValidationRuleDescription(kind: string): (_: any) => string {
    return this.customValidationDescriptions[kind];
  }

  getJSON(): OpenAPI {
    return this._openAPI!;
  }

  private generateYelixExample(yelixSchema: YelixValidationBase): any {
    const type = yelixSchema.type;
    if (type === "not-set") return "unknown";

    const isDatetime = yelixSchema.rules.some((r) => r.title === "datetime");
    const isOptional = yelixSchema.rules.some((r) => r.title === "optional");

    if (isOptional) return undefined;

    switch (type) {
      case "any":
        return "any value";
      case "string":
        return isDatetime ? new Date().toISOString() : "example string";
      case "number":
        return 42;
      case "boolean":
        return true;
      case "date":
        return new Date().toISOString();
      case "file":
        return "example.txt";
      case "object":
        if ("subFields" in yelixSchema) {
          const example: Record<string, any> = {};
          const subFields = yelixSchema.subFields as Record<
            string,
            YelixValidationBase
          >;
          if (!subFields) return {};

          for (const [key, subSchema] of Object.entries(subFields)) {
            const value = this.generateYelixExample(subSchema);
            if (value !== undefined) {
              example[key] = value;
            }
          }
          return example;
        }
        return {};
      case "array": {
        const arrayTypeRule = yelixSchema.rules.find(
          (r) => r.title === "arrayType",
        );
        if (arrayTypeRule?.value) {
          return [this.generateYelixExample(arrayTypeRule.value)];
        }
        return ["example"];
      }
      default:
        return "unknown";
    }
  }

  private yelixZodToJsonSchema(
    yelixSchema: YelixValidationBase,
  ): OpenAPIDefaultSchema {
    const schema: OpenAPIDefaultSchema = { type: "string" };

    const type = yelixSchema.type;
    if (type === "string") {
      schema.type = "string";
    } else if (type === "number") {
      schema.type = "number";
    } else if (type === "boolean") {
      schema.type = "boolean";
    } else if (type === "date") {
      schema.type = "string";
    } else if (type === "file") {
      schema.type = "string";
    } else if (type === "array") {
      schema.type = "array";
    } else if (type === "object") {
      schema.type = "object";
      if ("subFields" in yelixSchema) {
        schema.properties = {};
        for (
          const [key, subSchema] of Object.entries(
            yelixSchema.subFields as Record<string, YelixValidationBase>,
          )
        ) {
          schema.properties[key] = this.yelixZodToJsonSchema(subSchema);
        }
      }
    }

    return schema;
  }

  private getParamsFromPath(path: string) {
    return [...path.matchAll(/{([a-zA-Z0-9_]+)}/g)].map((match) => match[1]);
  }

  addNewEndpoint(apiDoc: NewEndpointParams) {
    if (!this._openAPI) {
      throw new Error("OpenAPI not initialized");
    }

    const { path, method } = apiDoc;
    const defaultSummary = `${method.toUpperCase()} ${path}`;

    const responses: Record<string, any> = {};
    const responseStatusCodes = Object.keys(apiDoc.responses || {});
    for (const statusCode of responseStatusCodes) {
      const response = apiDoc.responses![statusCode];

      responses[statusCode] = {
        description: response.description,
        content: {
          [response.type]: {
            schema: this.yelixZodToJsonSchema(
              response.zodSchema || inp().string(),
            ),
            examples: {
              autoGenerated: this.generateYelixExample(
                response.zodSchema || inp().string(),
              ),
            },
          },
        },
      };
    }

    const parameters = [];
    const queries = apiDoc.validation?.query;

    const params = this.getParamsFromPath(path);
    for (const param of params) {
      parameters.push({
        name: param,
        in: "path",
        required: true,
        schema: {
          type: "string",
        },
      });
    }

    if (queries) {
      for (const key in queries) {
        const query = queries[key];
        const queryDescription = apiDoc.query?.[key]?.description;
        let queryDefaultDescription = ""; // Markdown

        if (query instanceof YelixValidationBase) {
          queryDefaultDescription += "###### Validation Rules\n";

          const zodRules = query.rules || [];
          for (const rule of zodRules) {
            const customDescription = this.getValidationRuleDescription(
              rule.title,
            );

            if (customDescription) {
              queryDefaultDescription += customDescription(rule.value) + "\n";
            } else {
              queryDefaultDescription += "- " +
                rule.title +
                (rule.value ? ": " + rule.value : "") +
                "\n";
            }
          }
        }

        parameters.push({
          name: key,
          in: "query",
          required: query.hasRule("required"),
          schema: this.yelixZodToJsonSchema(query),
          description: queryDescription || queryDefaultDescription,
        });
      }
    }

    const lowerMethod = method.toLowerCase();
    this._openAPI.paths![path] = {
      [lowerMethod]: {
        tags: apiDoc.tags || [],
        summary: apiDoc.title || defaultSummary,
        description: apiDoc.description || "",
        responses: responses,
        parameters,
      },
    };
  }
}

export { YelixOpenAPI };
