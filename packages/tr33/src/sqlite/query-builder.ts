import z from "zod/v4";
import type { Config, ConfigInput } from "@/client/config";
import type { FindWorktreeEntriesArgs, WhereClause } from "@/types";

// Query operators that can be applied to any field
const QueryOperatorsSchema = z
  .object({
    eq: z.string().optional(),
    ne: z.string().optional(),
    gt: z.string().optional(),
    gte: z.string().optional(),
    lt: z.string().optional(),
    lte: z.string().optional(),
    in: z.string().array().optional(),
    notIn: z.string().array().optional(),
    like: z.string().optional(),
    ilike: z.string().optional(),
    notLike: z.string().optional(),
    notIlike: z.string().optional(),
    isNull: z.boolean().optional(),
    isNotNull: z.boolean().optional(),
  })
  .refine(
    (obj) => {
      return Object.values(obj).some((val) => val !== undefined);
    },
    {
      message: "At least one query condition must be specified.",
      path: [],
    },
  );

// Base type for recursive where clause - uses lazy evaluation for infinite nesting
const whereClauseSchema: z.ZodType<WhereClause> = z.lazy(() =>
  z.union([
    // AND clause: { AND: [clause1, clause2, ...] }
    z.object({
      AND: z.array(whereClauseSchema),
    }),
    // OR clause: { OR: [clause1, clause2, ...] }
    z.object({
      OR: z.array(whereClauseSchema),
    }),
    // Field conditions: { fieldName: "value" } or { fieldName: { eq: "value", ... } }
    z.record(
      z.string(),
      z.union([
        z.string(), // Simple equality: { field: "value" }
        QueryOperatorsSchema, // Complex operators: { field: { eq: "value", gt: "10" } }
        z.object({
          OR: z
            .array(QueryOperatorsSchema)
            .min(1, "OR array must have at least one condition"),
        }),
        z.object({
          AND: z
            .array(QueryOperatorsSchema)
            .min(1, "AND array must have at least one condition"),
        }),
        z.record(
          z.string(),
          z.union([
            z.string(), // Simple equality: { field: "value" }
            QueryOperatorsSchema, // Complex operators: { field: { eq: "value", gt: "10" } }
            z.object({
              OR: z
                .array(QueryOperatorsSchema)
                .min(1, "OR array must have at least one condition"),
            }),
            z.object({
              AND: z
                .array(QueryOperatorsSchema)
                .min(1, "AND array must have at least one condition"),
            }),
          ]),
        ),
      ]),
    ),
  ]),
);

// Drizzle query format types
type DrizzleFilterValue =
  | string
  | Record<string, string | string[] | boolean | undefined>
  | { OR: Array<Record<string, string | string[] | boolean>> }
  | { AND: Array<Record<string, string | string[] | boolean>> };

type DrizzleConnectionFilter = {
  connections: {
    AND: Array<{
      field: { eq: string };
      change: {
        filters: {
          AND: Array<{
            field: { eq: string };
            value: DrizzleFilterValue;
          }>;
        };
      };
    }>;
  };
};

type DrizzleFilterCondition =
  | {
      filters: {
        field: string;
        value: DrizzleFilterValue;
        version?: string;
      };
    }
  | DrizzleConnectionFilter;

type DrizzleWhereClause =
  | { AND: DrizzleWhereClause[] }
  | { OR: DrizzleWhereClause[] }
  | DrizzleFilterCondition
  | DrizzleFilterCondition[];

// Transform WhereClause to Drizzle query format using Zod
export const toDrizzleWhereClause = whereClauseSchema.transform(
  (clause): DrizzleWhereClause => {
    const transform = (c: WhereClause): DrizzleWhereClause => {
      // Handle AND clause
      if ("AND" in c && Array.isArray(c.AND)) {
        return {
          AND: c.AND.map(transform),
        };
      }

      // Handle OR clause
      if ("OR" in c && Array.isArray(c.OR)) {
        return {
          OR: c.OR.map(transform),
        };
      }

      // Handle field conditions (record of field -> value/operators)
      const entries = Object.entries(c).map(([field, value]) => {
        // Simple string value (equality)
        if (typeof value === "string") {
          return {
            filters: {
              field,
              value,
            },
          };
        }

        // Check if it's a nested OR/AND of operators
        if ("OR" in value && Array.isArray(value.OR)) {
          return {
            filters: {
              field,
              value: {
                OR: value.OR.map((op: z.infer<typeof QueryOperatorsSchema>) => {
                  const entries = Object.entries(op).filter(
                    ([_, v]) => v !== undefined,
                  );
                  return Object.fromEntries(entries);
                }),
              },
            },
          };
        }

        if ("AND" in value && Array.isArray(value.AND)) {
          return {
            filters: {
              field,
              value: {
                AND: value.AND.map(
                  (op: z.infer<typeof QueryOperatorsSchema>) => {
                    const entries = Object.entries(op).filter(
                      ([_, v]) => v !== undefined,
                    );
                    return Object.fromEntries(entries);
                  },
                ),
              },
            },
          };
        }

        // Check if this is a nested connection filter
        // (object with keys that aren't known operators)
        const knownOperators = new Set([
          "eq",
          "ne",
          "gt",
          "gte",
          "lt",
          "lte",
          "in",
          "notIn",
          "like",
          "ilike",
          "notLike",
          "notIlike",
          "isNull",
          "isNotNull",
        ]);

        const valueKeys = Object.keys(value);
        const isNestedConnection =
          valueKeys.length > 0 &&
          !valueKeys.every((key) => knownOperators.has(key));

        if (isNestedConnection) {
          // Transform nested connection filter
          const transformNestedField = (
            nestedValue: string | Record<string, unknown>,
          ): DrizzleFilterValue => {
            if (typeof nestedValue === "string") {
              return nestedValue;
            }

            // Check for OR/AND arrays
            if ("OR" in nestedValue && Array.isArray(nestedValue.OR)) {
              return {
                OR: nestedValue.OR.map(
                  (op: z.infer<typeof QueryOperatorsSchema>) => {
                    const entries = Object.entries(op).filter(
                      ([_, v]) => v !== undefined,
                    );
                    return Object.fromEntries(entries);
                  },
                ),
              };
            }

            if ("AND" in nestedValue && Array.isArray(nestedValue.AND)) {
              return {
                AND: nestedValue.AND.map(
                  (op: z.infer<typeof QueryOperatorsSchema>) => {
                    const entries = Object.entries(op).filter(
                      ([_, v]) => v !== undefined,
                    );
                    return Object.fromEntries(entries);
                  },
                ),
              };
            }

            // Regular operators
            const entries = Object.entries(nestedValue).filter(
              ([_, v]) => v !== undefined,
            );
            return Object.fromEntries(entries) as DrizzleFilterValue;
          };

          // Build connection filter structure
          const connectionFilters: Record<string, DrizzleFilterValue> = {};

          for (const [nestedField, nestedValue] of Object.entries(value)) {
            connectionFilters[nestedField] = transformNestedField(
              nestedValue as string | Record<string, unknown>,
            );
          }

          return {
            toConnections: {
              AND: [
                {
                  field: { eq: field },
                  toEntry: {
                    filters: {
                      AND: Object.entries(connectionFilters).map(
                        ([nestedField, nestedValue]) => ({
                          field: { eq: nestedField },
                          value: nestedValue,
                        }),
                      ),
                    },
                  },
                },
              ],
            },
          };
        }

        // Complex operators object (single level)
        const operators = value as Record<
          string,
          string | string[] | boolean | undefined
        >;
        const validEntries = Object.entries(operators).filter(
          ([_, v]) => v !== undefined,
        );

        if (validEntries.length === 0) {
          throw new Error(`No valid operators found for field: ${field}`);
        }

        return {
          filters: {
            field,
            value: Object.fromEntries(validEntries),
          },
        };
      });

      return entries.length === 1
        ? (entries[0] as DrizzleWhereClause)
        : (entries as DrizzleWhereClause);
    };

    return transform(clause);
  },
);

/**
 * Build a worktree query for findFirst operations.
 * Now queries through entries -> changes -> blob
 */
export function buildWorktreeQuery(
  args: FindWorktreeEntriesArgs,
  config: Config<ConfigInput>,
) {
  // Build conditions for entries (version-specific; worktree is not versioned)
  const namespaceConditions: unknown[] = [
    { version: { eq: config.version } },
    {
      collection: { eq: args.collection },
      variant: { eq: args.variant ?? config.defaultVariant() },
    },
  ];

  if (args.where) {
    const { __path, path, ...rest } = args.where as Record<string, unknown> & {
      __path?: string | Record<string, unknown>;
      path?: string | Record<string, unknown>;
    };

    // Path filter: support both __path (internal) and path (client API)
    const pathCondition = __path ?? path;
    if (pathCondition !== undefined) {
      namespaceConditions.push({ path: pathCondition });
    }

    // Process remaining where conditions if any exist
    if (Object.keys(rest).length > 0) {
      const whereConditions = toDrizzleWhereClause.parse(rest);
      const addVersionToCondition = (
        condition: DrizzleWhereClause,
        variant?: string | undefined,
      ): DrizzleWhereClause => {
        if ("AND" in condition) {
          return {
            AND: condition.AND.map((c) => addVersionToCondition(c, variant)),
          };
        }
        if ("OR" in condition) {
          return {
            OR: condition.OR.map((c) => addVersionToCondition(c, variant)),
          };
        }
        if ("filters" in condition) {
          return {
            filters: {
              ...condition.filters,
              version: config.version,
              // variant: variant,
            },
          };
        }
        // Connection filter (toConnections) - return as-is
        return condition;
      };

      if (Array.isArray(whereConditions)) {
        namespaceConditions.push(
          ...whereConditions.map((c) => addVersionToCondition(c, args.variant)),
        );
      } else {
        namespaceConditions.push(
          addVersionToCondition(whereConditions, args.variant),
        );
      }
    }
  }

  const query =
    namespaceConditions.length > 0 ? { AND: namespaceConditions } : undefined;

  // Forward declare transformReferences so transformWith can call it
  let transformReferences: (
    referencesClause?: Record<
      string,
      | boolean
      | {
          where?: Record<string, unknown>;
          limit?: number;
          offset?: number;
          with?: Record<string, unknown>;
          references?: Record<string, unknown>;
        }
    >,
  ) => Record<string, unknown> | undefined;

  const transformWith = (
    withClause?: Record<
      string,
      | boolean
      | {
          where?: Record<string, unknown>;
          limit?: number;
          offset?: number;
          with?: Record<string, unknown>;
          references?: Record<string, unknown>;
        }
    >,
  ): Record<string, unknown> => {
    if (!withClause) {
      // Default: include blob and all toConnections with their toEntry
      return {
        blob: {
          columns: {
            content: true,
          },
        },
        toConnections: {
          with: {
            toEntry: {
              with: {
                blob: {
                  columns: {
                    content: true,
                  },
                },
              },
            },
          },
        },
      };
    }

    const result: Record<string, unknown> = {
      blob: {
        columns: {
          content: true,
        },
      },
      // Always include toConnections by default so connections are populated
      toConnections: {
        with: {
          toEntry: {
            with: {
              blob: {
                columns: {
                  content: true,
                },
              },
            },
          },
        },
      },
    };

    for (const [key, value] of Object.entries(withClause)) {
      // Special keys that should be passed through (can override defaults)
      if (key === "filters" || key === "change") {
        result[key] = value;
        continue;
      }

      // Field name for connection
      if (value === true) {
        // Simple connection: { author: true }
        result.toConnections = {
          where: {
            field: { eq: key },
          },
          with: {
            toEntry: {
              with: {
                blob: {
                  columns: {
                    content: true,
                  },
                },
                // change: {
                // 	with: {
                // 		blob: true,
                // 	},
                // },
              },
            },
          },
        };
      } else if (typeof value === "object" && value !== null) {
        // Nested connection: { author: { where: { ... }, limit, offset, with: { ... }, references: { ... } } }
        const nestedWith =
          "with" in value
            ? transformWith(
                value.with as Record<
                  string,
                  | boolean
                  | {
                      where?: Record<string, unknown>;
                      limit?: number;
                      offset?: number;
                      with?: Record<string, unknown>;
                      references?: Record<string, unknown>;
                    }
                >,
              )
            : {
                change: {
                  with: {
                    blob: true,
                  },
                },
              };

        // Handle nested references within with clause
        const nestedReferences =
          "references" in value
            ? transformReferences(
                value.references as Record<
                  string,
                  | boolean
                  | {
                      where?: Record<string, unknown>;
                      limit?: number;
                      offset?: number;
                      with?: Record<string, unknown>;
                      references?: Record<string, unknown>;
                    }
                >,
              )
            : undefined;

        // Merge nestedWith and nestedReferences
        const mergedNested = {
          ...nestedWith,
          ...nestedReferences,
        };

        // Handle where clause for filtering the connected entry
        const whereClause =
          "where" in value && value.where
            ? toDrizzleWhereClause.parse(value.where)
            : undefined;

        // Handle limit and offset
        const limit = "limit" in value ? value.limit : undefined;
        const offset = "offset" in value ? value.offset : undefined;

        result.toConnections = {
          where: {
            field: { eq: key },
          },
          with: {
            toEntry: {
              where: whereClause,
              limit,
              offset,
              with: mergedNested,
            },
          },
        };
      }
    }

    return result;
  };

  // Transform references clause (uses fromConnections and referencedAs field)
  transformReferences = (
    referencesClause?: Record<
      string,
      | boolean
      | {
          where?: Record<string, unknown>;
          limit?: number;
          offset?: number;
          with?: Record<string, unknown>;
          references?: Record<string, unknown>;
        }
    >,
  ): Record<string, unknown> | undefined => {
    if (!referencesClause) return undefined;

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(referencesClause)) {
      // Field name for reverse connection (uses referencedAs)
      if (value === true) {
        // Simple reverse connection: { docsAuthored: true }
        result.fromConnections = {
          where: {
            referencedAs: { eq: key },
          },
          with: {
            fromEntry: {
              with: {
                blob: {
                  columns: {
                    content: true,
                  },
                },
              },
            },
          },
        };
      } else if (typeof value === "object" && value !== null) {
        // Nested reverse connection: { docsAuthored: { where: { ... }, limit, offset, with: { ... }, references: { ... } } }
        const nestedWith =
          "with" in value
            ? transformWith(
                value.with as Record<
                  string,
                  | boolean
                  | {
                      where?: Record<string, unknown>;
                      limit?: number;
                      offset?: number;
                      with?: Record<string, unknown>;
                      references?: Record<string, unknown>;
                    }
                >,
              )
            : {
                blob: {
                  columns: {
                    content: true,
                  },
                },
              };

        // Handle nested references within references clause
        const nestedReferences =
          "references" in value
            ? transformReferences(
                value.references as Record<
                  string,
                  | boolean
                  | {
                      where?: Record<string, unknown>;
                      limit?: number;
                      offset?: number;
                      with?: Record<string, unknown>;
                      references?: Record<string, unknown>;
                    }
                >,
              )
            : undefined;

        // Merge nestedWith and nestedReferences
        const mergedNested = {
          ...nestedWith,
          ...nestedReferences,
        };

        // Handle where clause for filtering the referenced entries
        const whereClause =
          "where" in value && value.where
            ? toDrizzleWhereClause.parse(value.where)
            : undefined;

        // Handle limit and offset
        const limit = "limit" in value ? value.limit : undefined;
        const offset = "offset" in value ? value.offset : undefined;

        // Build the where clause for fromConnections:
        // - Always filter by referencedAs
        // - If there's a where clause, apply it via fromEntry
        //   at the connection level so limit/offset apply AFTER filtering
        const connectionWhere = whereClause
          ? {
              AND: [{ referencedAs: { eq: key } }, { fromEntry: whereClause }],
            }
          : { referencedAs: { eq: key } };

        result.fromConnections = {
          where: connectionWhere,
          limit,
          offset,
          with: {
            fromEntry: {
              with: mergedNested,
            },
          },
        };
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  };

  const withClause = transformWith(args.with);
  const referencesClause = transformReferences(args.references);

  // Merge withClause and referencesClause
  const finalWithClause = {
    ...withClause,
    ...referencesClause,
  };

  return {
    query,
    finalWithClause,
    limit: args.limit,
    offset: args.offset,
  };
}
