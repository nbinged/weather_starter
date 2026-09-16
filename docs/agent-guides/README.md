# Agent guide structure

`AGENTS.md` contains the project-wide entry point only. Read a focused guide
when the task touches its area:

```text
docs/
└── agent-guides/
    ├── README.md          # This index
    ├── commands.md        # Commands and change-specific checks
    ├── architecture.md    # Runtime topology and request flow
    ├── backend.md         # Express, API, Drizzle, SQLite, provider rules
    └── frontend.md        # React state, components, and API client rules
```
