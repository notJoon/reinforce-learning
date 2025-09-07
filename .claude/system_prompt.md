## Code Quality Standards

NEVER write production code that contains:

1. **throw statements in normal operation paths** — always return `Result`-like objects (`Either`, `Result`, `Promise.reject`) or handle errors gracefully
2. **usage of `any`** — prefer strict typing with `unknown`, generics, or discriminated unions
3. **implicit `null`/`undefined` handling** — all optional values must be explicitly typed and checked
4. **inconsistent error handling patterns** — establish and follow a single approach (`try/catch`, `Either`, or domain-specific errors)

ALWAYS:

1. **Write comprehensive tests BEFORE implementing features**
2. **Include invariant validation in data structures and domain models**
3. **Perform exhaustive checks on enums and discriminated unions**
4. **Document known bugs immediately and fix them before continuing**
5. **Maintain separation of concerns between modules and layers**
6. **Run static analysis tools (ESLint, TypeScript strict mode, tsc, type-checking) before considering code complete**

---

## Development Process Guards

### TESTING REQUIREMENTS:
- Write failing tests first, then implement to make them pass
- Never commit code with unhandled rejections
- Include property-based testing for pure functions
- Test both type-level safety and runtime behavior
- Validate all edge cases and boundary conditions (especially with `null`/`undefined`)

### ARCHITECTURE REQUIREMENTS:
- Explicit error handling — no hidden throws or silent failures
- Type safety — strict null checks, no implicit coercion
- Performance conscious — avoid unnecessary copies, deep clones, and excessive object spreads
- API design — consistent return types across all public functions

### REVIEW CHECKPOINTS:

Before marking any code complete, verify:

1. **No compilation or type-check warnings**
2. **All tests pass (including async tests and concurrency scenarios)**
3. **No unhandled `undefined` or `null` paths**
4. **Error handling is consistent and explicit**
5. **Code is modular and maintainable**
6. **Documentation matches implementation**
7. **Type inference behaves as expected**
8. **Performance benchmarks show acceptable results**

---

## TypeScript-Specific Quality Standards

### ERROR HANDLING:
- Use discriminated unions or error objects for all fallible operations
- Avoid `throw` in library code; prefer returning structured errors
- Never rely on implicit `any` or `unknown` without narrowing
- Use `never` in exhaustive `switch` to guarantee coverage
- Provide meaningful error messages with context

### TYPE SAFETY:
- Enable `strict` mode in `tsconfig.json`
- Avoid `any`; use generics, conditional types, or `unknown` with narrowing
- Define explicit return types for all public functions
- Model invariants using TypeScript’s type system whenever possible
- Prefer `readonly` and immutability for state safety

### MODULE ORGANIZATION:
- Single responsibility per module
- Clear boundaries between internal/private APIs and exported/public APIs
- Comprehensive JSDoc or TSDoc documentation
- Logical dependency hierarchy — no circular imports

---

## Critical Patterns to Avoid

### DANGEROUS PATTERNS:
```ts
// NEVER DO THIS - silent throw in normal flow
throw new Error("Unexpected state");

// NEVER DO THIS - using any
function process(data: any) {
  return data.value;
}

// NEVER DO THIS - unchecked type assertion
const user = data as User; // unsafe if structure is different

// NEVER DO THIS - ignoring Promise errors
someAsyncOperation();
````

### PREFERRED PATTERNS:

```ts
// DO THIS - structured error handling
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function operation(): Result<number> {
  try {
    const value = riskyOperation();
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// DO THIS - safe narrowing
if ("id" in data && typeof data.id === "number") {
  const id: number = data.id;
}

// DO THIS - exhaustive checking
type Shape = { kind: "circle"; r: number } | { kind: "square"; size: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "square": return s.size ** 2;
    default: const _exhaustive: never = s; return _exhaustive;
  }
}

// DO THIS - proper async error handling
await someAsyncOperation().catch((e) => {
  console.error("Operation failed", e);
});
```

---

## Testing Standards

### COMPREHENSIVE TEST COVERAGE:

* Unit tests for all public functions
* Integration tests for async and I/O-heavy code
* Property-based tests for pure utility functions
* Stress tests for concurrency and large input sets
* Edge case and boundary condition tests

### TEST ORGANIZATION:

```ts
describe("MyModule", () => {
  it("handles normal operation", () => {
    expect(doSomething(2)).toBe(4);
  });

  it("handles edge cases", () => {
    expect(() => doSomething(-1)).toThrow();
  });

  it("preserves invariants", () => {
    const model = new DomainModel();
    model.apply({ type: "INIT" });
    expect(model.isValid()).toBe(true);
  });
});
```

---

## Documentation Standards

### CODE DOCUMENTATION:

* Document all public APIs with usage examples
* Explain complex algorithms and type-level tricks
* Document invariants and type expectations
* Include safety notes for runtime checks
* Provide example inputs/outputs in doc comments

### ERROR DOCUMENTATION:

```ts
/**
 * Inserts a key-value pair into the map.
 *
 * @param key - Key must be a non-empty string
 * @param value - Value to associate with the key
 * @returns Previous value if key existed, otherwise undefined
 *
 * @throws {InvalidKeyError} if key violates constraints
 *
 * @example
 * const map = new StringMap();
 * map.insert("foo", "bar"); // => undefined
 * map.insert("foo", "baz"); // => "bar"
 */
insert(key: string, value: string): string | undefined {
  // Implementation
}
```
