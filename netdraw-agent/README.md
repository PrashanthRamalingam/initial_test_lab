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
| **Response Model** | `Claude Opus -4.8` — the strongest option for pulling topology out of messy configs and long port maps. `Claude-Haiku-4.5` is the cheap/fast alternative for short descriptions; test both on a real topology. |
| **Short Description** | `Turns network descriptions, configs and port maps into diagrams you can edit here and export as Visio, PDF or PNG.` |
| **Instructions** | Paste the whole of `INSTRUCTIONS.md`. |
| **Knowledge / files** (next step) | Upload `KNOWLEDGE-netdraw-syntax.md`. If the platform has no knowledge upload, append that file to the end of the Instructions instead. |
| **Tools** (Tools Management tab) | Enable **Editable Diagrams** (renders the diagram in the chat) and **File Upload** (so you can drop in configs and port maps). Add **Generate Document** if you want HLD/handover packs. Web Search, Web Scraper, AI Research and Interactive Chart are not needed. |

### Check what Editable Diagrams accepts

Most such tools take Mermaid, which is what this agent emits. Confirm with a
one-line test before rolling the agent out:

    A[Router] --> B[Switch]

If the tool rejects it, ask it (or the platform owner) which syntax it wants
— draw.io XML and PlantUML are the usual alternatives — and the Instructions
can be adjusted to emit that instead. NetDraw keeps consuming the mermaid
either way.

## Using it

1. Describe the network to the agent, upload a config or port map, or paste
   an existing diagram plus a change request.
2. The Editable Diagrams tool renders it in the chat — good enough for
   review, discussion and quick iteration.
3. When you need a deliverable, copy the ```mermaid block, open NetDraw
   (`netdraw-standalone.html` or the hosted app), paste it into the message
   box at the bottom of the canvas and press Generate.
4. Fix any wrong icon with the Device type dropdown, drag anything you want
   moved, add zones and notes, then export: PNG, SVG, PDF, Visio (.vsdx) or
   draw.io.

Rule of thumb: **the platform for the conversation, NetDraw for the
artefact.** Only NetDraw writes .vsdx, carries your imported Cisco stencils,
and works with no network at all.

## Division of labour

| | Agent (AgentGPT) | NetDraw |
|---|---|---|
| Reads messy prose, configs, port maps | yes | no |
| Renders a diagram to look at | yes, via Editable Diagrams | yes |
| Visio `.vsdx` / draw.io / PDF / PNG export | no | yes |
| Imported Cisco / vendor stencils | no | yes |
| Zones, annotation notes, per-end interface labels | no | yes |
| Works with no network | no | yes |

## If the platform ever allows custom tools

A tool that returns files could skip the copy-paste: point it at NetDraw's
diagram JSON — the format the **Save** button writes and the **Open** button
reads — and the agent can hand back a ready-made `.json` diagram.
