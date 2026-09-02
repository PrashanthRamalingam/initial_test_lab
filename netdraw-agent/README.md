# NetDraw diagram agent

Configuration for an internal AI-agent platform (the "Create New Agent"
form: Agent Name / Response Model / Short Description / Instructions /
knowledge files).

The agent does the language work; NetDraw does the drawing and the exports.

    engineer's description  ──►  agent  ──►  mermaid syntax
                                                  │
                                            paste into NetDraw
                                                  │
                                    diagram  +  PNG / SVG / PDF / Visio / draw.io

## Filling in the form

| Field | Value |
|---|---|
| **Agent Name** | `Network Diagram Builder` |
| **Response Model** | The most capable general model in the dropdown. This is a structured-output task, so a mid-tier model is usually enough — test with a real topology before standardising. |
| **Short Description** | `Turns network descriptions, port maps and change requests into diagram syntax you can render and export as Visio, PDF or PNG.` |
| **Instructions** | Paste the whole of `INSTRUCTIONS.md`. |
| **Knowledge / files** (next step) | Upload `KNOWLEDGE-netdraw-syntax.md`. If the platform has no knowledge upload, append that file to the end of the Instructions instead. |
| **Tools** | None required. This agent only generates text. |

## Using it

1. Describe the network to the agent, or paste a port map, an existing
   diagram plus a change request, or config output.
2. Copy the ```mermaid block it returns.
3. Open NetDraw (`netdraw-standalone.html`, or the hosted app), paste into
   the message box at the bottom of the canvas, and press Generate.
4. Fix any wrong icon with the Device type dropdown, drag anything you want
   moved, then export: PNG, SVG, PDF, Visio (.vsdx) or draw.io.

## Why the agent does not draw the diagram itself

An agent in a chat box returns text. NetDraw is the renderer: it turns that
text into positioned icons with a crossing-reduced layout, zones and notes,
and writes the Visio/draw.io/PDF files. Keeping the split means the agent
needs no tools, no network access and no plugins — and every diagram stays
editable afterwards.

## If your platform can host tools instead

Should the platform later allow a tool/function that returns files, the same
instructions work unchanged — point the tool at NetDraw's diagram JSON
(the format the **Save** button writes and the **Open** button reads) rather
than mermaid, and the agent can hand back a ready-made `.json` diagram.
