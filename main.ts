import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "@std/cli/parse-args";

const MetadataSchema = z.object({
  fileName: z.string(),
  relativePath: z.string(),
  tags: z.array(z.string()).optional(),
  headings: z
    .array(
      z.object({
        heading: z.string(),
        level: z.number(),
      })
    )
    .optional(),
  aliases: z.array(z.string()).optional(),
  links: z
    .array(
      z.object({
        link: z.string(),
        relativePath: z.string().optional(),
        cleanLink: z.string().optional(),
        displayText: z.string().optional(),
      })
    )
    .optional(),
  backlinks: z
    .array(
      z.object({
        fileName: z.string(),
        link: z.string(),
        relativePath: z.string(),
        cleanLink: z.string().optional(),
        displayText: z.string().optional(),
      })
    )
    .optional(),
  frontmatter: z
    .object({
      cssclass: z.string().optional(),
      publish: z.boolean().optional(),
      position: z.object({
        start: z.object({
          line: z.number(),
          col: z.number(),
        }),
        end: z.object({
          line: z.number(),
          col: z.number(),
        }),
      }),
    })
    .catchall(z.any())
    .optional(),
});

const args = parseArgs(Deno.args)
if (!args.vault) {
  console.warn("Error: No vault path provided.");
  console.warn("Usage: deno run main.ts --vaultPath=/path/to/vault");
}

const vaultPath = args.vaultPath;
let vaultMetadata: z.infer<typeof MetadataSchema>[] = [];

const server = new McpServer({
  name: "Obsidian-Notes",
  version: "0.1.0"
});

function loadMetadata(vaultPathParam: string): void {
  const metadataPath = path.join(vaultPathParam, '.obsidian/plugins/metadata-extractor/metadata.json');
  try {
    const data = fs.readFileSync(metadataPath, 'utf-8');
    vaultMetadata = JSON.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse metadata.json: ${error.message}`);
    } else {
      throw new Error("Failed to parse metadata.json: Unknown error");
    }
  }
}

server.tool(
  "search-notes",
  "Search notes by providing a topic. This will return a list of notes that match the topic.",
  {
    topic: z.string()
  },
  ({ topic }) => {
    
    const matches: {
      filePath: string;
      matchType: string;
      text: string;
    }[] = [];

    vaultMetadata.forEach((item) => {
      // Check fileName
      if (item.fileName.includes(topic)) {
        matches.push({
          filePath: item.relativePath,
          matchType: "fileName",
          text: item.fileName,
        });
      }

      // Check relativePath
      if (item.relativePath.includes(topic)) {
        matches.push({
          filePath: item.relativePath,
          matchType: "relativePath",
          text: item.relativePath,
        });
      }

      // Check tags
      if (item.tags) {
        item.tags.forEach((tag) => {
          if (tag.includes(topic)) {
            matches.push({
              filePath: item.relativePath,
              matchType: "tags",
              text: tag,
            });
          }
        });
      }

      // Check headings.heading
      if (item.headings) {
        item.headings.forEach((heading) => {
          if (heading.heading.includes(topic)) {
            matches.push({
              filePath: item.relativePath,
              matchType: "headings",
              text: heading.heading,
            });
          }
        });
      }
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({topic, matches}),
        }
      ]
    }
  }
);

server.tool(
  "get-note",
  "Get the contents of a note by providing the file path. File paths can be discovered using the search-notes tool.",
  {
    filePath: z.string()
  },
  ({ filePath }) => {
    
    const decodedFilePath = decodeURIComponent(filePath);
    const fullPath = path.join(vaultPath, decodedFilePath);
    let fileContents = "";

    try {
      fileContents = fs.readFileSync(fullPath, 'utf-8');
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ filePath, text: fileContents })
        }]
      }
    } catch (error) {
      if (error instanceof Error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ filePath, error: `Failed to read file: ${error.message}` })
          }]
        }
      } else {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ filePath, error: "Failed to read file: Unknown error" })
          }]
        }
      }
    }
  }
);

// ----------------------------------------------------------------------
// The following resources are just copies of the tools above. Ideally,
// the tools should be removed once more applications (e.g. VS Code) support
// MCP Resources.
// ----------------------------------------------------------------------

server.resource(
  "Notes metadata: get note metadata by providing a topic",
  new ResourceTemplate("metadata://{topic}", { list: undefined }),
  (uri: URL, { topic }) => {
    
    if (typeof topic !== "string") {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ error: "Invalid topic. Expected a string." }),
            mimeType: "application/json"
          }
        ]
      };
    }

    const matches: {
      filePath: string;
      matchType: string;
      text: string;
    }[] = [];

    vaultMetadata.forEach((item) => {
      // Check fileName
      if (item.fileName.includes(topic)) {
        matches.push({
          filePath: item.relativePath,
          matchType: "fileName",
          text: item.fileName,
        });
      }

      // Check relativePath
      if (item.relativePath.includes(topic)) {
        matches.push({
          filePath: item.relativePath,
          matchType: "relativePath",
          text: item.relativePath,
        });
      }

      // Check tags
      if (item.tags) {
        item.tags.forEach((tag) => {
          if (tag.includes(topic)) {
            matches.push({
              filePath: item.relativePath,
              matchType: "tags",
              text: tag,
            });
          }
        });
      }

      // Check headings.heading
      if (item.headings) {
        item.headings.forEach((heading) => {
          if (heading.heading.includes(topic)) {
            matches.push({
              filePath: item.relativePath,
              matchType: "headings",
              text: heading.heading,
            });
          }
        });
      }
    });

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({topic, matches}),
          mimeType: "application/json",
        }
      ]
    }
  }
)

server.resource(
  "Note: get the contents of a note by providing the file path.",
  new ResourceTemplate("note://{+filePath}", { list: undefined }),
  (uri: URL, { filePath }) => {
    
    if (typeof filePath !== "string") {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ error: "Invalid path. Expected a string." }),
            mimeType: "application/json"
          }
        ]
      };
    }

    const decodedFilePath = decodeURIComponent(filePath);
    const fullPath = path.join(vaultPath, decodedFilePath);
    let fileContents = "";

    try {
      fileContents = fs.readFileSync(fullPath, 'utf-8');
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ filePath: decodedFilePath, text: fileContents }),
            mimeType: "application/json",
          }
        ]
      }
    } catch (error) {
      if (error instanceof Error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ error: `Failed to read file: ${error.message}` }),
              mimeType: "application/json"
            }
          ]
        };
      } else {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ error: "Failed to read file: Unknown error" }),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  }
)

const transport = new StdioServerTransport();
loadMetadata(vaultPath);
await server.connect(transport);