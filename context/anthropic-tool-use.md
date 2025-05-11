[Anthropic home page![light logo](https://mintlify.s3.us-west-1.amazonaws.com/anthropic/logo/light.svg)![dark logo](https://mintlify.s3.us-west-1.amazonaws.com/anthropic/logo/dark.svg)](https://docs.anthropic.com/)


Tool use (function calling)

Tool use with Claude

[Welcome](https://docs.anthropic.com/en/home) [User Guides](https://docs.anthropic.com/en/docs/welcome) [API Reference](https://docs.anthropic.com/en/api/getting-started) [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) [Prompt Library](https://docs.anthropic.com/en/prompt-library/library) [Release Notes](https://docs.anthropic.com/en/release-notes/overview)

Claude is capable of interacting with tools and functions, allowing you to extend Claude’s capabilities to perform a wider variety of tasks.

Learn everything you need to master tool use with Claude via our new
comprehensive [tool use\\
course](https://github.com/anthropics/courses/tree/master/tool_use)! Please
continue to share your ideas and suggestions using this
[form](https://forms.gle/BFnYc6iCkWoRzFgk7).

Here’s an example of how to provide tools to Claude using the Messages API:

Shell

Python

TypeScript

import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function main() {
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-latest",
    max_tokens: 1024,
    tools: [{
      name: "get_weather",
      description: "Get the current weather in a given location",
      input_schema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA"
          }
        },
        required: ["location"]
      }
    }],
    messages: [{ 
      role: "user", 
      content: "Tell me the weather in San Francisco." 
    }]
  });

  console.log(response);
}

main().catch(console.error);

Java

Copy

```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-7-sonnet-20250219",
    "max_tokens": 1024,
    "tools": [\
      {\
        "name": "get_weather",\
        "description": "Get the current weather in a given location",\
        "input_schema": {\
          "type": "object",\
          "properties": {\
            "location": {\
              "type": "string",\
              "description": "The city and state, e.g. San Francisco, CA"\
            }\
          },\
          "required": ["location"]\
        }\
      }\
    ],
    "messages": [\
      {\
        "role": "user",\
        "content": "What is the weather like in San Francisco?"\
      }\
    ]
  }'

```

* * *

## [​](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview\#how-tool-use-works)  How tool use works

Claude supports two types of tools:

1. **Client tools**: Tools that execute on your systems, which include:
   - User-defined custom tools that you create and implement
   - Anthropic-defined tools like [computer use (beta)](https://docs.anthropic.com/en/docs/build-with-claude/computer-use) and [text editor](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/text-editor-tool) that require client implementation
2. **Server tools**: Tools that execute on Anthropic’s servers, like the [web search](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/web-search-tool) tool. These tools must be specified in the API request but don’t require implementation on your part.


Anthropic-defined tools use versioned types (e.g., `web_search_20250305`, `text_editor_20250124`) to ensure compatibility across model versions.

### [​](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview\#client-tools)  Client tools

Integrate client tools with Claude in these steps:

1

Provide Claude with tools and a user prompt

- Define client tools with names, descriptions, and input schemas in your API request.
- Include a user prompt that might require these tools, e.g., “What’s the weather in San Francisco?”

2

Claude decides to use a tool

- Claude assesses if any tools can help with the user’s query.
- If yes, Claude constructs a properly formatted tool use request.
- For client tools, the API response has a `stop_reason` of `tool_use`, signaling Claude’s intent.

3

Execute the tool and return results

- Extract the tool name and input from Claude’s request
- Execute the tool code on your system
- Return the results in a new `user` message containing a `tool_result` content block

4

Claude uses tool result to formulate a response

- Claude analyzes the tool results to craft its final response to the original user prompt.

Note: Steps 3 and 4 are optional. For some workflows, Claude’s tool use request (step 2) might be all you need, without sending results back to Claude.

### [​](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview\#server-tools)  Server tools

Server tools follow a different workflow:

1

Provide Claude with tools and a user prompt

- Server tools, like [web search](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/web-search-tool), have their own parameters.
- Include a user prompt that might require these tools, e.g., “Search for the latest news about AI.”

2

Claude executes the server tool

- Claude assesses if a server tool can help with the user’s query.
- If yes, Claude executes the tool, and the results are automatically incorporated into Claude’s response.

3

Claude uses the server tool result to formulate a response

- Claude analyzes the server tool results to craft its final response to the original user prompt.
- No additional user interaction is needed for server tool execution.

* * *

## [​](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview\#tool-use-examples)  Tool use examples

Here are a few code examples demonstrating various tool use patterns and techniques. For brevity’s sake, the tools are simple tools, and the tool descriptions are shorter than would be ideal to ensure best performance.

Single tool example

Shell

Python

Java

Copy

```bash
curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "model": "claude-3-7-sonnet-20250219",
    "max_tokens": 1024,
    "tools": [{\
        "name": "get_weather",\
        "description": "Get the current weather in a given location",\
        "input_schema": {\
            "type": "object",\
            "properties": {\
                "location": {\
                    "type": "string",\
                    "description": "The city and state, e.g. San Francisco, CA"\
                },\
                "unit": {\
                    "type": "string",\
                    "enum": ["celsius", "fahrenheit"],\
                    "description": "The unit of temperature, either \"celsius\" or \"fahrenheit\""\
                }\
            },\
            "required": ["location"]\
        }\
    }],
    "messages": [{"role": "user", "content": "What is the weather like in San Francisco?"}]
}'

```

Claude will return a response similar to:

JSON

Copy

```JSON
{
  "id": "msg_01Aq9w938a90dw8q",
  "model": "claude-3-7-sonnet-20250219",
  "stop_reason": "tool_use",
  "role": "assistant",
  "content": [\
    {\
      "type": "text",\
      "text": "<thinking>I need to call the get_weather function, and the user wants SF, which is likely San Francisco, CA.</thinking>"\
    },\
    {\
      "type": "tool_use",\
      "id": "toolu_01A09q90qw90lq917835lq9",\
      "name": "get_weather",\
      "input": {"location": "San Francisco, CA", "unit": "celsius"}\
    }\
  ]
}

```

You would then need to execute the `get_weather` function with the provided input, and return the result in a new `user` message:

Shell

Python

Java

Copy

```bash
curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "model": "claude-3-7-sonnet-20250219",
    "max_tokens": 1024,
    "tools": [\
        {\
            "name": "get_weather",\
            "description": "Get the current weather in a given location",\
            "input_schema": {\
                "type": "object",\
                "properties": {\
                    "location": {\
                        "type": "string",\
                        "description": "The city and state, e.g. San Francisco, CA"\
                    },\
                    "unit": {\
                        "type": "string",\
                        "enum": ["celsius", "fahrenheit"],\
                        "description": "The unit of temperature, either \"celsius\" or \"fahrenheit\""\
                    }\
                },\
                "required": ["location"]\
            }\
        }\
    ],
    "messages": [\
        {\
            "role": "user",\
            "content": "What is the weather like in San Francisco?"\
        },\
        {\
            "role": "assistant",\
            "content": [\
                {\
                    "type": "text",\
                    "text": "<thinking>I need to use get_weather, and the user wants SF, which is likely San Francisco, CA.</thinking>"\
                },\
                {\
                    "type": "tool_use",\
                    "id": "toolu_01A09q90qw90lq917835lq9",\
                    "name": "get_weather",\
                    "input": {\
                        "location": "San Francisco, CA",\
                        "unit": "celsius"\
                    }\
                }\
            ]\
        },\
        {\
            "role": "user",\
            "content": [\
                {\
                    "type": "tool_result",\
                    "tool_use_id": "toolu_01A09q90qw90lq917835lq9",\
                    "content": "15 degrees"\
                }\
            ]\
        }\
    ]
}'

```

This will print Claude’s final response, incorporating the weather data:

JSON

Copy

```JSON
{
  "id": "msg_01Aq9w938a90dw8q",
  "model": "claude-3-7-sonnet-20250219",
  "stop_reason": "stop_sequence",
  "role": "assistant",
  "content": [\
    {\
      "type": "text",\
      "text": "The current weather in San Francisco is 15 degrees Celsius (59 degrees Fahrenheit). It's a cool day in the city by the bay!"\
    }\
  ]
}

```

Multiple tool example

You can provide Claude with multiple tools to choose from in a single request. Here’s an example with both a `get_weather` and a `get_time` tool, along with a user query that asks for both.

Shell

Python

Java

Copy

```bash
curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "model": "claude-3-7-sonnet-20250219",
    "max_tokens": 1024,
    "tools": [{\
        "name": "get_weather",\
        "description": "Get the current weather in a given location",\
        "input_schema": {\
            "type": "object",\
            "properties": {\
                "location": {\
                    "type": "string",\
                    "description": "The city and state, e.g. San Francisco, CA"\
                },\
                "unit": {\
                    "type": "string",\
                    "enum": ["celsius", "fahrenheit"],\
                    "description": "The unit of temperature, either 'celsius' or 'fahrenheit'"\
                }\
            },\
            "required": ["location"]\
        }\
    },\
    {\
        "name": "get_time",\
        "description": "Get the current time in a given time zone",\
        "input_schema": {\
            "type": "object",\
            "properties": {\
                "timezone": {\
                    "type": "string",\
                    "description": "The IANA time zone name, e.g. America/Los_Angeles"\
                }\
            },\
            "required": ["timezone"]\
        }\
    }],
    "messages": [{\
        "role": "user",\
        "content": "What is the weather like right now in New York? Also what time is it there?"\
    }]
}'

```

In this case, Claude will most likely try to use two separate tools, one at a time — `get_weather` and then `get_time` — in order to fully answer the user’s question. However, it will also occasionally output two `tool_use` blocks at once, particularly if they are not dependent on each other. You would need to execute each tool and return their results in separate `tool_result` blocks within a single `user` message.

Missing information

If the user’s prompt doesn’t include enough information to fill all the required parameters for a tool, Claude 3 Opus is much more likely to recognize that a parameter is missing and ask for it. Claude 3 Sonnet may ask, especially when prompted to think before outputting a tool request. But it may also do its best to infer a reasonable value.

For example, using the `get_weather` tool above, if you ask Claude “What’s the weather?” without specifying a location, Claude, particularly Claude 3 Sonnet, may make a guess about tools inputs:

JSON

Copy

```JSON
{
  "type": "tool_use",
  "id": "toolu_01A09q90qw90lq917835lq9",
  "name": "get_weather",
  "input": {"location": "New York, NY", "unit": "fahrenheit"}
}

```

This behavior is not guaranteed, especially for more ambiguous prompts and for models less intelligent than Claude 3 Opus. If Claude 3 Opus doesn’t have enough context to fill in the required parameters, it is far more likely respond with a clarifying question instead of making a tool call.

Sequential tools

Some tasks may require calling multiple tools in sequence, using the output of one tool as the input to another. In such a case, Claude will call one tool at a time. If prompted to call the tools all at once, Claude is likely to guess parameters for tools further downstream if they are dependent on tool results for tools further upstream.

Here’s an example of using a `get_location` tool to get the user’s location, then passing that location to the `get_weather` tool:

Shell

Python

Java

Copy

```bash
curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "model": "claude-3-7-sonnet-20250219",
    "max_tokens": 1024,
    "tools": [\
        {\
            "name": "get_location",\
            "description": "Get the current user location based on their IP address. This tool has no parameters or arguments.",\
            "input_schema": {\
                "type": "object",\
                "properties": {}\
            }\
        },\
        {\
            "name": "get_weather",\
            "description": "Get the current weather in a given location",\
            "input_schema": {\
                "type": "object",\
                "properties": {\
                    "location": {\
                        "type": "string",\
                        "description": "The city and state, e.g. San Francisco, CA"\
                    },\
                    "unit": {\
                        "type": "string",\
                        "enum": ["celsius", "fahrenheit"],\
                        "description": "The unit of temperature, either 'celsius' or 'fahrenheit'"\
                    }\
                },\
                "required": ["location"]\
            }\
        }\
    ],
    "messages": [{\
        "role": "user",\
        "content": "What is the weather like where I am?"\
    }]
}'

```

In this case, Claude would first call the `get_location` tool to get the user’s location. After you return the location in a `tool_result`, Claude would then call `get_weather` with that location to get the final answer.

The full conversation might look like:

| Role | Content |
| --- | --- |
| User | What’s the weather like where I am? |
| Assistant | <thinking>To answer this, I first need to determine the user’s location using the get\_location tool. Then I can pass that location to the get\_weather tool to find the current weather there.</thinking>\[Tool use for get\_location\] |
| User | \[Tool result for get\_location with matching id and result of San Francisco, CA\] |
| Assistant | \[Tool use for get\_weather with the following input\]{ “location”: “San Francisco, CA”, “unit”: “fahrenheit” } |
| User | \[Tool result for get\_weather with matching id and result of “59°F (15°C), mostly cloudy”\] |
| Assistant | Based on your current location in San Francisco, CA, the weather right now is 59°F (15°C) and mostly cloudy. It’s a fairly cool and overcast day in the city. You may want to bring a light jacket if you’re heading outside. |

This example demonstrates how Claude can chain together multiple tool calls to answer a question that requires gathering data from different sources. The key steps are:

1. Claude first realizes it needs the user’s location to answer the weather question, so it calls the `get_location` tool.
2. The user (i.e. the client code) executes the actual `get_location` function and returns the result “San Francisco, CA” in a `tool_result` block.
3. With the location now known, Claude proceeds to call the `get_weather` tool, passing in “San Francisco, CA” as the `location` parameter (as well as a guessed `unit` parameter, as `unit` is not a required parameter).
4. The user again executes the actual `get_weather` function with the provided arguments and returns the weather data in another `tool_result` block.
5. Finally, Claude incorporates the weather data into a natural language response to the original question.

Chain of thought tool use

By default, Claude 3 Opus is prompted to think before it answers a tool use query to best determine whether a tool is necessary, which tool to use, and the appropriate parameters. Claude 3 Sonnet and Claude 3 Haiku are prompted to try to use tools as much as possible and are more likely to call an unnecessary tool or infer missing parameters. To prompt Sonnet or Haiku to better assess the user query before making tool calls, the following prompt can be used:

Chain of thought prompt

`Answer the user's request using relevant tools (if they are available). Before calling a tool, do some analysis within \<thinking>\</thinking> tags. First, think about which of the provided tools is the relevant tool to answer the user's request. Second, go through each of the required parameters of the relevant tool and determine if the user has directly provided or given enough information to infer a value. When deciding if the parameter can be inferred, carefully consider all the context to see if it supports a specific value. If all of the required parameters are present or can be reasonably inferred, close the thinking tag and proceed with the tool call. BUT, if one of the values for a required parameter is missing, DO NOT invoke the function (not even with fillers for the missing params) and instead, ask the user to provide the missing parameters. DO NOT ask for more information on optional parameters if it is not provided.     `

JSON mode

You can use tools to get Claude produce JSON output that follows a schema, even if you don’t have any intention of running that output through a tool or function.

When using tools in this way:

- You usually want to provide a **single** tool
- You should set `tool_choice` (see [Forcing tool use](https://docs.anthropic.com/en/docs/tool-use#forcing-tool-use)) to instruct the model to explicitly use that tool
- Remember that the model will pass the `input` to the tool, so the name of the tool and description should be from the model’s perspective.

The following uses a `record_summary` tool to describe an image following a particular format.

Shell

Python

Java

Copy

```bash
#!/bin/bash
IMAGE_URL="https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg"
IMAGE_MEDIA_TYPE="image/jpeg"
IMAGE_BASE64=$(curl "$IMAGE_URL" | base64)

curl https://api.anthropic.com/v1/messages \
     --header "content-type: application/json" \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --data \
'{
    "model": "claude-3-5-sonnet-latest",
    "max_tokens": 1024,
    "tools": [{\
        "name": "record_summary",\
        "description": "Record summary of an image using well-structured JSON.",\
        "input_schema": {\
            "type": "object",\
            "properties": {\
                "key_colors": {\
                    "type": "array",\
                    "items": {\
                        "type": "object",\
                        "properties": {\
                            "r": { "type": "number", "description": "red value [0.0, 1.0]" },\
                            "g": { "type": "number", "description": "green value [0.0, 1.0]" },\
                            "b": { "type": "number", "description": "blue value [0.0, 1.0]" },\
                            "name": { "type": "string", "description": "Human-readable color name in snake_case, e.g. \"olive_green\" or \"turquoise\"" }\
                        },\
                        "required": [ "r", "g", "b", "name" ]\
                    },\
                    "description": "Key colors in the image. Limit to less than four."\
                },\
                "description": {\
                    "type": "string",\
                    "description": "Image description. One to two sentences max."\
                },\
                "estimated_year": {\
                    "type": "integer",\
                    "description": "Estimated year that the image was taken, if it is a photo. Only set this if the image appears to be non-fictional. Rough estimates are okay!"\
                }\
            },\
            "required": [ "key_colors", "description" ]\
        }\
    }],
    "tool_choice": {"type": "tool", "name": "record_summary"},
    "messages": [\
        {"role": "user", "content": [\
            {"type": "image", "source": {\
                "type": "base64",\
                "media_type": "'$IMAGE_MEDIA_TYPE'",\
                "data": "'$IMAGE_BASE64'"\
            }},\
            {"type": "text", "text": "Describe this image."}\
        ]}\
    ]
}'

```

* * *

## [​](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview\#pricing)  Pricing

Tool use requests are priced based on:

1. The total number of input tokens sent to the model (including in the `tools` parameter)
2. The number of output tokens generated
3. For server-side tools, additional usage-based pricing (e.g., web search charges per search performed)

Client-side tools are priced the same as any other Claude API request, while server-side tools may incur additional charges based on their specific usage.

The additional tokens from tool use come from:

- The `tools` parameter in API requests (tool names, descriptions, and schemas)
- `tool_use` content blocks in API requests and responses
- `tool_result` content blocks in API requests

When you use `tools`, we also automatically include a special system prompt for the model which enables tool use. The number of tool use tokens required for each model are listed below (excluding the additional tokens listed above). Note that the table assumes at least 1 tool is provided. If no `tools` are provided, then a tool choice of `none` uses 0 additional system prompt tokens.

| Model | Tool choice | Tool use system prompt token count |
| --- | --- | --- |
| Claude 3.7 Sonnet | `auto`, `none`<br>* * *<br> `any`, `tool` | 346 tokens<br>* * *<br>313 tokens |
| Claude 3.5 Sonnet (Oct) | `auto`, `none`<br>* * *<br> `any`, `tool` | 346 tokens<br>* * *<br>313 tokens |
| Claude 3 Opus | `auto`, `none`<br>* * *<br> `any`, `tool` | 530 tokens<br>* * *<br>281 tokens |
| Claude 3 Sonnet | `auto`, `none`<br>* * *<br> `any`, `tool` | 159 tokens<br>* * *<br>235 tokens |
| Claude 3 Haiku | `auto`, `none`<br>* * *<br> `any`, `tool` | 264 tokens<br>* * *<br>340 tokens |
| Claude 3.5 Sonnet (June) | `auto`, `none`<br>* * *<br> `any`, `tool` | 294 tokens<br>* * *<br>261 tokens |

These token counts are added to your normal input and output tokens to calculate the total cost of a request.

Refer to our [models overview table](https://docs.anthropic.com/en/docs/models-overview#model-comparison) for current per-model prices.

When you send a tool use prompt, just like any other API request, the response will output both input and output token counts as part of the reported `usage` metrics.

* * *

## [​](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview\#next-steps)  Next Steps

Explore our repository of ready-to-implement tool use code examples in our cookbooks:

[**Calculator Tool** \\
\\
Learn how to integrate a simple calculator tool with Claude for precise numerical computations.](https://github.com/anthropics/anthropic-cookbook/blob/main/tool_use/calculator_tool.ipynb) [**Customer Service Agent** \\
\\
Build a responsive customer service bot that leverages client tools to\\
enhance support.](https://github.com/anthropics/anthropic-cookbook/blob/main/tool_use/customer_service_agent.ipynb) [**JSON Extractor** \\
\\
See how Claude and tool use can extract structured data from unstructured text.](https://github.com/anthropics/anthropic-cookbook/blob/main/tool_use/extracting_structured_json.ipynb)

Was this page helpful?

YesNo

[Multilingual support](https://docs.anthropic.com/en/docs/build-with-claude/multilingual-support) [How to implement tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/implement-tool-use)

On this page

- [How tool use works](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#how-tool-use-works)
- [Client tools](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#client-tools)
- [Server tools](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#server-tools)
- [Tool use examples](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#tool-use-examples)
- [Pricing](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#pricing)
- [Next Steps](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#next-steps)