---
title: From Apr 3 Tr33 API Reference
author: ../authors/heidi.md
description: Learn how to use Tr33's API to configure, connect, and interact with your data collections. This reference covers the core functions, configuration options, and usage examples to help you integrate Tr33 into your projects efficiently.
---

# Tr33 API Reference

This document provides a detailed reference for Tr33's public API.

## Core Functions

### `defineConfig`

Creates a type-safe configuration for Tr33.

```typescript
function defineConfig<T extends ConfigInput>(config: T): T;
```

#### Parameters

- `config`: Configuration object with the following properties:
  - `org`: Organization name
  - `repo`: Repository name
  - `ref`: Git reference (branch, tag, or commit)
  - `remote`: Path to the local repository
  - `version`: Version string
  - `orm`: Object containing collection definitions

#### Returns

The validated configuration object.

### `createClient`

Creates an Tr33 client instance.

```typescript
function createClient<T extends ConfigInput>(
  config: T,
  database: Client
): OrmConfig<T["orm"]> & {
  _: {
    database: Database;
    git: GitOperations;
  };
};
```

#### Parameters

- `config`: Configuration object created with `defineConfig`
- `database`: Database client instance

#### Returns

An Tr33 client with collection endpoints and Git operations.

## Collection API

### Collection Definition

Collections are defined using Zod schemas:

```typescript
const collection = z.collection({
  name: string,
  schema: z.ZodObject,
  match: string,
  type: "markdown" | "json",
});
```

#### Properties

- `name`: Unique identifier for the collection
- `schema`: Zod schema defining the content structure
- `match`: Glob pattern for matching files
- `type`: Content type ("markdown" or "json")

### Collection Methods

Each collection provides the following methods:

#### `findFirst`

Finds the first item matching the query.

```typescript
findFirst(args: {
  where?: QueryConditions;
  with?: WithConditions;
}): Promise<Item | null>
```

#### `findMany`

Finds all items matching the query.

```typescript
findMany(args: {
  where?: QueryConditions;
  with?: WithConditions;
  limit?: number;
  offset?: number;
  orderBy?: OrderByConditions;
}): Promise<{
  items: Item[];
  total: number;
}>
```

## Query API

### Query Conditions

Query conditions support the following operators:

```typescript
type QueryOperator<T> = {
  eq?: T; // Equal to
  ne?: T; // Not equal to
  gt?: T; // Greater than
  gte?: T; // Greater than or equal to
  lt?: T; // Less than
  lte?: T; // Less than or equal to
  in?: T[]; // In array
  notIn?: T[]; // Not in array
  like?: string; // Like pattern
  ilike?: string; // Case-insensitive like
  notLike?: string; // Not like pattern
  notIlike?: string; // Case-insensitive not like
  isNull?: true; // Is null
  isNotNull?: true; // Is not null
  arrayContains?: T[]; // Array contains all values
  arrayContained?: T[]; // Array is contained in values
  arrayOverlaps?: T[]; // Arrays have common elements
  OR?: QueryOperator<T>[]; // OR conditions
  AND?: QueryOperator<T>[]; // AND conditions
  NOT?: QueryOperator<T>; // NOT condition
};
```

### With Conditions

The `with` parameter supports including related content:

```typescript
type WithConditions = {
  [key: string]: boolean | WithConditions;
};
```

### Order By Conditions

```typescript
type OrderByConditions = {
  [key: string]: "asc" | "desc";
};
```

## Git Operations

The Git API is available through the `_.git` property:

### `init`

Initializes the Git repository.

```typescript
init(): Promise<void>
```

### `fetch`

Fetches the latest changes from the remote.

```typescript
fetch(): Promise<void>
```

### `checkout`

Checks out the specified reference.

```typescript
checkout(): Promise<void>
```

### `show`

Shows the contents of a file.

```typescript
show(args: { path: string }): Promise<{
  oid: string;
  content: string;
} | null>
```

### `writeBlob`

Writes content to a blob.

```typescript
writeBlob(args: { content: string }): Promise<{
  oid: string;
}>
```

### `add`

Adds a file to the index.

```typescript
add(args: { path: string; oid: string }): Promise<void>
```

## Types

### `ConfigInput`

```typescript
type ConfigInput = {
  org: string;
  repo: string;
  ref: string;
  remote: string;
  version: string;
  orm: Record<string, Collection>;
};
```

### `Collection`

```typescript
type Collection = {
  name: string;
  schema: z.ZodObject;
  match: string;
  type: "markdown" | "json";
};
```

### `QueryConditions`

```typescript
type QueryConditions = {
  [key: string]: QueryOperator<unknown>;
};
```

### `WithConditions`

```typescript
type WithConditions = {
  [key: string]: boolean | WithConditions;
};
```

### `OrderByConditions`

```typescript
type OrderByConditions = {
  [key: string]: "asc" | "desc";
};
```

## Error Handling

Tr33 uses a Result type for error handling:

```typescript
type Result<T, E> = {
  isOk(): boolean;
  isErr(): boolean;
  unwrap(): T;
  unwrapErr(): E;
};
```

Common error types:

```typescript
type Tr33Error = {
  code: "NotFound" | "ValidationError" | "GitError";
  message: string;
};
```

## Examples

### Basic Query

```typescript
const result = await tr33.post.findFirst({
  where: {
    title: { eq: "Hello World" },
    publishedAt: { gt: "2023-01-01" },
  },
  with: {
    author: true,
  },
});
```

### Complex Query

```typescript
const result = await tr33.post.findMany({
  where: {
    OR: [
      { title: { like: "Getting Started%" } },
      { title: { like: "Tutorial%" } },
    ],
    tags: { arrayContains: ["typescript"] },
  },
  with: {
    author: {
      with: {
        posts: true,
      },
    },
  },
  limit: 10,
  offset: 0,
  orderBy: {
    publishedAt: "desc",
  },
});
```

### Git Operations

```typescript
// Initialize repository
await tr33._.git.init();

// Create new content
const content = "# New Post\n\nThis is a new post.";
const blob = await tr33._.git.writeBlob({ content });
await tr33._.git.add({ path: "content/posts/new-post.md", oid: blob.oid });

// View content
const file = await tr33._.git.show({ path: "content/posts/example.md" });
```

For more examples and use cases, check out the [Guides](./guides.md).
