# Application types

DOMINAO has no accounts. Every player at a table is identified by their guest
session.

CodeGenerating keeps codes unique within a context. The app uses one context for
session tokens, and later another for table join codes.

```types
concrete CodeContext
  The kind of code being generated: SESSION_TOKENS for guest session tokens.
```

```instances
instantiate CodeGenerating with
  Context is CodeContext

instantiate GuestSessioning
```
