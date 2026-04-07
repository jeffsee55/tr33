---
title: Tr33 Guides
author: ../authors/jeff.md
description: A collection of practical guides and examples to help you use Tr33 for real-world projects, including setup, configuration, and common patterns.
---

# Tr33 Guides

This guide provides practical examples and common use cases for Tr33. Each section focuses on a specific aspect of using Tr33 effectively.

## Setting Up a Blog

Let's create a simple blog using Tr33. We'll define collections for blog posts and authors.

```typescript
import { defineConfig, createClient } from "tr33";
import { z } from "zod";

// Define the author collection
const author = z.collection({
  name: "author",
  schema: z.object({
    name: z.string(),
    bio: z.markdown(),
    email: z.string().email(),
  }),
  match: "content/authors/*.md",
  type: "markdown",
});

// Define the blog post collection
const post = z.collection({
  name: "post",
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    author: z.string(), // Reference to author's file path
    content: z.markdown(),
    publishedAt: z.string().datetime(),
    tags: z.array(z.string()),
  }),
  match: "content/posts/*.md",
  type: "markdown",
});

// Create the configuration
const config = defineConfig({
  org: "your-org",
  repo: "your-blog",
  ref: "main",
  remote: "/path/to/blog",
  version: "1",
  orm: {
    author,
    post,
  },
});

// Initialize the client
const tr33 = createClient(config, database);
```

### Querying Blog Posts

```typescript
// Get all published posts
const posts = await tr33.post.findMany({
  where: {
    publishedAt: { lt: new Date().toISOString() },
  },
  with: {
    author: true, // Include author information
  },
});

// Get posts by tag
const taggedPosts = await tr33.post.findMany({
  where: {
    tags: { arrayContains: ["typescript"] },
  },
});

// Get posts by author
const authorPosts = await tr33.post.findMany({
  where: {
    author: { eq: "content/authors/john-doe.md" },
  },
});
```

## Managing Documentation

Tr33 is great for managing documentation. Here's how to set up a documentation site:

```typescript
const docPage = z.collection({
  name: "docPage",
  schema: z.object({
    title: z.string(),
    category: z.string(),
    order: z.number(),
    content: z.markdown(),
    relatedPages: z.array(z.string()),
  }),
  match: "docs/**/*.md",
  type: "markdown",
});

const config = defineConfig({
  org: "your-org",
  repo: "your-docs",
  ref: "main",
  remote: "/path/to/docs",
  version: "1",
  orm: {
    docPage,
  },
});
```

### Organizing Documentation

```typescript
// Get all pages in a category
const categoryPages = await tr33.docPage.findMany({
  where: {
    category: { eq: "getting-started" },
  },
  orderBy: {
    order: "asc",
  },
});

// Get related pages
const page = await tr33.docPage.findFirst({
  where: {
    title: { eq: "Installation" },
  },
  with: {
    relatedPages: true,
  },
});
```

## Working with Assets

Tr33 can manage relationships between content and assets:

```typescript
const asset = z.collection({
  name: "asset",
  schema: z.object({
    url: z.string(),
    title: z.string(),
    alt: z.string(),
    type: z.enum(["image", "video", "document"]),
    metadata: z.record(z.unknown()),
  }),
  match: "content/assets/*.json",
  type: "json",
});

const page = z.collection({
  name: "page",
  schema: z.object({
    title: z.string(),
    content: z.markdown(),
    featuredImage: z.string(), // Reference to asset
    gallery: z.array(z.string()), // References to assets
  }),
  match: "content/pages/*.md",
  type: "markdown",
});
```

### Querying Assets

```typescript
// Get all images
const images = await tr33.asset.findMany({
  where: {
    type: { eq: "image" },
  },
});

// Get pages with their assets
const pages = await tr33.page.findMany({
  with: {
    featuredImage: true,
    gallery: true,
  },
});
```

## Advanced Queries

Tr33 supports complex queries with multiple conditions:

```typescript
// Complex query example
const results = await tr33.post.findMany({
  where: {
    OR: [
      { title: { like: "Getting Started%" } },
      { title: { like: "Tutorial%" } },
    ],
    publishedAt: { gt: "2023-01-01" },
    tags: { arrayContains: ["typescript"] },
    author: { eq: "content/authors/jane-doe.md" },
  },
  with: {
    author: true,
  },
});
```

## Git Operations

Here are some common Git operations you might need:

```typescript
// Initialize and set up
await tr33._.git.init();
await tr33._.git.fetch();
await tr33._.git.checkout();

// Create new content
const content = "# New Post\n\nThis is a new post.";
const blob = await tr33._.git.writeBlob({ content });
await tr33._.git.add({ path: "content/posts/new-post.md", oid: blob.oid });

// View content
const file = await tr33._.git.show({ path: "content/posts/example.md" });
```

## Best Practices

1. **Organize Content**: Use a clear directory structure for your content
2. **Use Relations**: Define relationships between collections for better data modeling
3. **Type Safety**: Leverage TypeScript and Zod for type-safe content
4. **Version Control**: Use Git features for content versioning
5. **Query Optimization**: Use specific queries instead of fetching all content
6. **Error Handling**: Always handle potential errors in your queries

## Common Patterns

### Pagination

```typescript
const getPaginatedPosts = async (page: number, pageSize: number) => {
  const posts = await tr33.post.findMany({
    where: {
      publishedAt: { lt: new Date().toISOString() },
    },
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return posts;
};
```

### Search

```typescript
const searchPosts = async (query: string) => {
  return await tr33.post.findMany({
    where: {
      OR: [
        { title: { like: `%${query}%` } },
        { content: { like: `%${query}%` } },
      ],
    },
  });
};
```

### Related Content

```typescript
const getRelatedPosts = async (post: Post) => {
  return await tr33.post.findMany({
    where: {
      tags: {
        arrayOverlaps: post.tags,
      },
      slug: { ne: post.slug },
    },
    limit: 3,
  });
};
```

For more detailed information about specific features, check out the [API Reference](./api.md).
