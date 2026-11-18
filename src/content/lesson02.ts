import { FptLessonContent } from '../types';

export const LESSON_0_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'We’ll continue using First Principles Thinking. The goal isn’t to memorize TypeScript syntax—it’s to understand the underlying engineering problems that make these features necessary.',
      'In this unit, we cover three connected topics: **Generics and generic constraints**, **Async functions and Promise types**, and **Error modeling and typed results**. For each one, we’ll follow the same reasoning path: *identify the problem → derive the requirement → understand the mechanism → examine its consequences*.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Together, these three ideas let backend functions stay reusable without losing type safety, represent operations that finish in the future without blocking Node.js, and make expected failures visible right in the function’s return type instead of hiding behind guesswork.',
    prerequisites: [
      {
        subBlockId: '0.1',
        label: 'Structural typing & type compatibility (0.1.2)',
        detail:
          'TypeScript checks whether a value has the required shape rather than requiring a specific class or type name.',
      },
      {
        subBlockId: '0.1',
        label: 'Type narrowing & discriminated unions (0.1.3, 0.1.4)',
        detail:
          'Using a literal tag property lets control-flow checks prove which outcome branch you are in at compile time.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-0.2.1',
      topicId: '0.2.1',
      title: 'Generics and generic constraints',
      problemAndRequirementsMarkdown: [
        '### First principles: Why do generics exist?',
        'Imagine you’re building a backend application and need a simple utility function that returns whatever value it receives. For numbers, that looks like this:',
        '```typescript\nfunction identity(value: number): number {\n  return value;\n}\n```',
        'That works fine for numbers. But soon you need the exact same logic for strings, and then for objects:',
        '```typescript\nfunction identityString(value: string): string {\n  return value;\n}\n\nfunction identityObject(value: object): object {\n  return value;\n}\n```',
        'What’s happening here? You are writing essentially the same logic repeatedly, only changing the type.',
        '',
        'You might try solving the duplication with `any`:',
        '```typescript\nfunction identity(value: any): any {\n  return value;\n}\n\nconst result = identity(100);\nresult.toUpperCase(); // TypeScript stays silent, and this crashes at runtime!\n```',
        'We traded repetitive code for weak type safety because `any` disables type checking on `result`. Neither extreme is ideal.',
        '',
        '### Deriving the requirement',
        'What do we actually need? We need a function that:',
        '1. Accepts different types of values.',
        '2. Returns the same type of value it received.',
        '3. **Preserves the relationship between its input and output types.**',
        '',
        'Notice that third requirement. We don’t merely want to say that the input and output can be *anything*—we want to say that **the output type depends on the input type**. That relationship is the fundamental reason generics exist.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Generic types',
        'Here is how we express that relationship in TypeScript:',
        '```typescript\nfunction identity<T>(value: T): T {\n  return value;\n}\n```',
        'What is `T`? Think of it as a **type variable**. Just as a normal variable holds a value, a generic type parameter holds a *type* that gets filled in when the function is called:',
        '```typescript\nconst numberResult = identity<number>(100);      // T = number -> returns number\nconst stringResult = identity<string>("Hello");  // T = string -> returns string\n```',
        'You don’t even have to write `<number>` every time. Usually TypeScript infers `T` automatically from the argument you pass:',
        '```typescript\nconst result = identity(100); // TypeScript infers T as number, so result is number\n```',
        'One implementation, different types, and the input-output relationship stays intact.',
        '',
        '### What if generics are too flexible? (Generic constraints)',
        'Now let’s look at a slightly different problem. Suppose you want a function that reads the `.length` property of whatever value it receives:',
        '```typescript\nfunction getLength<T>(value: T) {\n  return value.length; // Compile error: Property "length" does not exist on type "T"\n}\n```',
        'Why does TypeScript complain? Because an unconstrained `T` could be *anything*—a `number`, a `boolean`, a `string`, or an array. Not every possible type has a `.length` property.',
        '',
        'We don’t want to give up generics; we just want to restrict which types are allowed. That leads to **generic constraints**:',
        '```typescript\nfunction getLength<T extends { length: number }>(value: T): number {\n  return value.length;\n}\n\ngetLength("Hello");        // Valid\ngetLength([1, 2, 3]);      // Valid\ngetLength({ length: 10 }); // Valid\ngetLength(100);            // Error: number does not have { length: number }\n```',
        'Why does this work? Connect it back to **structural typing** from Sub-block 0.1. We aren’t asking whether `value` belongs to one specific named class or only `string`. `T extends { length: number }` simply means: *`T` can be any type, provided it satisfies the shape `{ length: number }`*.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '0.2.1-ex-1',
            title: 'Type-safe property lookup using generic constraints',
            language: 'typescript',
            code: `function getProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key];
}

const user = {
  name: "Zain",
  age: 19,
};

const name = getProperty(user, "name");   // inferred as string
const age = getProperty(user, "age");     // inferred as number
// getProperty(user, "salary");           // Error: "salary" is not a key of user`,
          },
          lineByLineMarkdown: [
            '- **`T extends object`**: Ensures the first argument is an object whose keys we can inspect.',
            '- **`K extends keyof T`**: Restricts `key` to only the actual property names present on `T` (`"name" | "age"` for `user`), so passing `"salary"` fails at compile time.',
            '- **`: T[K]`**: Tells TypeScript the return type matches the exact type of that specific property (`string` for `"name"`, `number` for `"age"`).',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'This pattern is what makes reusable backend utilities practical: database query helpers that return your exact entity type, configuration readers (`getConfigValue`), and API client functions that preserve the expected response shape without repeating the logic for every resource.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **`extends` checks structure, not class inheritance**: In `<T extends { length: number }>`, `extends` means “must satisfy at least this shape,” not “must inherit from a parent class.”',
        '- **Types still disappear at runtime**: Like all TypeScript types from 0.1, `<T>` is erased when JavaScript runs—you get compile-time safety with zero runtime overhead, which also means you cannot check `typeof T` at runtime.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Generics allow us to write reusable logic while preserving relationships between input and output types, and generic constraints give reusable code flexibility without sacrificing type guarantees.',
    },
    {
      id: 'topic-0.2.2',
      topicId: '0.2.2',
      title: 'Async functions and Promise types',
      problemAndRequirementsMarkdown: [
        '### First principles: Why do Promises exist?',
        'Let’s move from type relationships to how programs execute over time. Imagine your backend needs to load a user record from a database:',
        '```typescript\nconst user = database.findUser(10);\n```',
        'Suppose the database takes 200 milliseconds to reply over the network. Should JavaScript freeze everything else on the server while waiting for that single database response?',
        '',
        'That would stall every other user’s request. Instead, JavaScript runs I/O operations asynchronously so other work can continue while waiting for database queries, timers, or network calls.',
        '',
        '### Deriving the requirement',
        'This creates a clear problem: if the database hasn’t responded yet when the function finishes starting the request, the function cannot immediately return a `User`.',
        '',
        'Instead, it needs to return an object that represents the **eventual outcome** of that in-flight operation—something callers can attach follow-up work to once the result (or failure) arrives.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Promise',
        'That placeholder object is a **`Promise<T>`**:',
        '```typescript\nfunction getUser(): Promise<User> {\n  return fetchUserFromDatabase();\n}\n```',
        'What does `Promise<User>` mean? It means the function immediately returns a `Promise` whose **fulfilled value** will be a `User`. It does *not* return a `User` directly.',
        '',
        'At any point, a Promise is in one of three states:',
        '- **Pending**: The operation is still running and hasn’t settled yet.',
        '- **Fulfilled**: The operation finished successfully and produced a value (here, `User`).',
        '- **Rejected**: The operation failed with an error.',
        '',
        'Notice the distinction: a `Promise` is not the data itself—it is the object representing the eventual result or failure.',
        '',
        '### Why do we use `async` and `await`?',
        'Without `async`/`await`, you consume a Promise using `.then(...)`:',
        '```typescript\nfunction loadUser() {\n  return fetchUser().then((user) => {\n    console.log(user);\n    return user;\n  });\n}\n```',
        'That works for one step, but chaining several dependent steps with nested `.then()` callbacks quickly gets hard to read. `async` and `await` let us write asynchronous steps cleanly top-to-bottom:',
        '```typescript\nasync function loadUser(): Promise<User> {\n  const user = await fetchUser();\n  return user;\n}\n```',
        'Here is what each keyword actually does:',
        '- **`async`** ensures the function always returns a `Promise`.',
        '- **`await`** pauses *only this `async` function’s continuation* until the Promise settles, letting the rest of JavaScript keep running in the meantime.',
        '- If the Promise **fulfills**, `await` produces the resolved value (`User`).',
        '- If the Promise **rejects**, `await` throws that rejection right at that line so `try/catch` can handle it.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '0.2.2-ex-1',
            title: 'How async wraps return values and await unwraps them',
            language: 'typescript',
            code: `// Even though we return a plain number, async wraps it in a fulfilled Promise
async function getAge(): Promise<number> {
  return 19;
}

// Conceptually equivalent to:
function getAgeExplicit(): Promise<number> {
  return Promise.resolve(19);
}

async function greetUser(): Promise<string> {
  const age = await getAge(); // Inside the function, age is number (not Promise<number>)
  return \`User is \${age} years old\`;
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 2–4**: Writing `return 19` inside an `async` function automatically wraps `19` into a fulfilled `Promise<number>`.',
            '- **Lines 7–9**: `getAgeExplicit` shows what `async` is doing under the hood with `Promise.resolve(19)`.',
            '- **Lines 12–13**: `await getAge()` unwraps the `Promise<number>` so `age` has type `number` inside `greetUser`, while `greetUser` itself returns `Promise<string>`.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Every database query, Redis lookup, file read, and HTTP request in a Node.js backend returns a Promise. Using `async`/`await` lets request handlers wait cleanly for I/O without freezing the server’s single JavaScript thread for other concurrent requests.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **`Promise<T>` only types success**: Notice `Promise<User>` tells callers what comes back if the Promise fulfills, **not** what error types might reject.',
        '- **Don’t forget `await`**: Without `await`, a variable holds `Promise<User>` instead of `User`, and a rejected Promise returned directly from inside a `try` block can slip past your local `catch` before it rejects.',
      ].join('\n\n'),
      centralIdeaSummary:
        'A Promise represents an eventual future outcome (pending, fulfilled, or rejected), while async and await let you pause a function’s continuation to read that result without blocking the rest of the JavaScript thread.',
    },
    {
      id: 'topic-0.2.3',
      topicId: '0.2.3',
      title: 'Error modeling and typed results',
      problemAndRequirementsMarkdown: [
        '### First principles: What’s wrong with ordinary error handling?',
        'Imagine your backend exposes a function to load a user:',
        '```typescript\nasync function getUser(id: number): Promise<User> {\n  const user = await database.findUser(id);\n\n  if (!user) {\n    throw new Error("User not found");\n  }\n\n  return user;\n}\n```',
        'Think about everything that can happen when this runs: the user might exist, the user might not exist, or the database might time out.',
        '',
        'Yet look at the declared return type: **`Promise<User>`**. TypeScript describes the happy path (`User`), **but says nothing at all about `"User not found"`**—TypeScript doesn’t have a built-in `Promise<User, Error>` signature that tracks thrown exceptions.',
        '',
        'So callers know what success looks like, while expected failure outcomes remain invisible at compile time.',
        '',
        '### Deriving the requirement',
        'We need a way to describe both outcomes explicitly in the return type:',
        '- **Success**: A user was found.',
        '- **Failure**: The operation failed for a known reason.',
        '',
        'Remember **discriminated unions** from Sub-block 0.1? We already know how to model mutually exclusive outcomes safely with a shared tag field. We can combine that exact idea with **generics**.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Typed results',
        'Let’s define a reusable `Result<T, E>` type:',
        '```typescript\ntype Result<T, E> =\n  | { success: true; data: T }\n  | { success: false; error: E };\n```',
        'Look at how two earlier concepts work together here:',
        '- **Generics (`T` and `E`)** let `Result` wrap *any* success data type `T` and *any* failure type `E`.',
        '- **A discriminated union (`success: true | false`)** guarantees that success carries `data` and failure carries `error`, never a broken mix of both.',
        '',
        'When an `async` function returns **`Promise<Result<User, UserError>>`**, read it from the inside out:',
        '1. **`User`** is the data when it succeeds.',
        '2. **`UserError`** is the modeled failure when it doesn’t.',
        '3. **`Result<User, UserError>`** means you get *either* one outcome or the other.',
        '4. **`Promise<...>`** means that entire outcome arrives asynchronously.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '0.2.3-ex-1',
            title: 'Returning and narrowing a Promise<Result<User, UserError>>',
            language: 'typescript',
            code: `type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

type UserError = {
  code: "NOT_FOUND" | "DATABASE_ERROR";
  message: string;
};

async function getUser(id: number): Promise<Result<User, UserError>> {
  const user = await database.findUser(id);

  if (!user) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "User does not exist" },
    };
  }

  return { success: true, data: user };
}

async function displayUser(id: number) {
  const result = await getUser(id);

  if (result.success) {
    console.log(result.data.name);    // Safe: TypeScript narrowed to { success: true; data: User }
  } else {
    console.log(result.error.message); // Safe: TypeScript narrowed to { success: false; error: UserError }
  }
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–3**: Defines the generic discriminated union `Result<T, E>` using `success` as the tag.',
            '- **Lines 10–21**: `getUser` returns `{ success: false, error: ... }` instead of throwing for a missing user, putting `"NOT_FOUND"` directly into its return contract.',
            '- **Lines 26–30**: When `displayUser` checks `if (result.success)`, TypeScript’s narrowing from Sub-block 0.1 proves `result.data` exists in the `if` branch and `result.error` exists in the `else` branch.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown: [
        '### But are exceptions useless now?',
        '**No.** This is an important engineering distinction between two kinds of failure:',
        '- **Expected failures**: Ordinary domain outcomes your code should anticipate—like user not found, invalid input, insufficient permissions, or duplicate email. These are great candidates for typed `Result` values.',
        '- **Unexpected failures**: Infrastructure crashes (database down, network drop) or programming bugs. Exceptions and `try/catch` remain the right tool here so stack traces and top-level error handlers still catch them.',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown: [
        '- **`Promise<Result<T, E>>` can still reject unexpectedly**: Returning a `Result` handles expected business failures, not a crashed database socket—that underlying call can still reject.',
        '- **Why `catch (error)` treats `error` as `unknown`**: In JavaScript, anything can be thrown (not just `Error` instances). Strict TypeScript types caught errors as `unknown`, requiring a check like `if (error instanceof Error)` before reading `error.message`.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Typed results make expected success and failure outcomes explicit in a function’s type contract, while exceptions remain essential for unexpected infrastructure and programming failures.',
    },
  ],
  conceptConnection: {
    title: 'Connecting the three concepts',
    narrativeMarkdown: [
      'Before moving to the knowledge check, notice how these concepts fit together when building a reusable backend API helper:',
      '',
      '| Requirement | TypeScript mechanism |',
      '| --- | --- |',
      '| Work with different data types without losing type information | Generics (`<T>`) |',
      '| Restrict which types a reusable function accepts | Generic constraints (`extends`) |',
      '| Represent operations that complete in the future | `Promise<T>` |',
      '| Write readable asynchronous code | `async` / `await` |',
      '| Represent success and expected failure explicitly | Typed `Result<T, E>` |',
      '| Ensure each outcome has the exact right fields | Discriminated unions |',
      '',
      'The deeper connection is that all three topics replace hidden assumptions with explicit relationships—between inputs and outputs, present calls and future results, and success and failure.',
    ].join('\n'),
    integratedExample: {
      id: '0.2-integrated-example',
      title: 'A reusable typed API fetch helper combining all three concepts',
      language: 'typescript',
      code: `type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

type ApiError = {
  status: number;
  message: string;
};

// Combines generics (<T>), Promise, async/await, and Result<T, ApiError>
async function fetchResource<T>(
  url: string
): Promise<Result<T, ApiError>> {
  const response = await fetch(url);

  if (!response.ok) {
    return {
      success: false,
      error: { status: response.status, message: "Request failed" },
    };
  }

  const data = (await response.json()) as T;
  return { success: true, data };
}`,
    },
    walkthroughMarkdown: [
      '- **Generics (`<T>`)** let `fetchResource<User>("/users/1")` or `fetchResource<Order>("/orders/9")` share one implementation while returning the requested `User` or `Order` inside `data`.',
      '- **`async` and `Promise`** handle the network latency without blocking the thread.',
      '- **`Result<T, ApiError>`** makes an HTTP failure (`!response.ok`) an explicit, compiler-checked branch alongside success—while unexpected network crashes still throw to an outer `try/catch`.',
    ].join('\n'),
  },
  questions: [
    {
      id: '0.2-kc-1',
      focusArea: 'Generics',
      prompt:
        'You have a function that accepts a value and returns it. Why is using `any` weaker than using `<T>(value: T): T`? What important relationship does `T` preserve?',
      hints: [
        'Compare what TypeScript knows about the return value of `identity(100)` when the parameter/return type is `any` vs `<T>`.',
        'Think about what happens if you accidentally call `.toUpperCase()` on the returned `100`.',
        '`any` breaks the link between input and output by disabling type checking, whereas `<T>` acts as a type variable that preserves the relationship so the output type matches the input type.',
      ],
      explanation:
        'Using `any` disables type checking on both the input and output, so TypeScript forgets what type went in and lets invalid operations like `(100).toUpperCase()` compile. Using `<T>(value: T): T` preserves the relationship between input and output: whatever type `T` the caller passes in is the exact type TypeScript knows comes back out.',
      evaluationCriteria: [
        'Explains why `any` disables type checking and loses the input type',
        'Explains that `<T>` preserves the input-to-output type relationship',
      ],
      topicIds: ['0.2.1'],
    },
    {
      id: '0.2-kc-2',
      focusArea: 'Generic Constraints',
      prompt:
        'You create `function getLength<T>(value: T)`. Why can’t TypeScript guarantee that `value.length` exists? How does `T extends { length: number }` solve this without restricting you to only strings?',
      hints: [
        'Think about all the types someone could pass to an unconstrained `<T>` (like `number` or `boolean`).',
        'Connect `extends` back to structural typing from Sub-block 0.1.',
        'Without a constraint, `T` could be a `number` or `boolean` with no `.length`. `<T extends { length: number }>` requires only that shape—allowing strings, arrays, or custom objects with `length: number` while rejecting numbers.',
      ],
      explanation:
        'An unconstrained `<T>` accepts any type, including `number` or `boolean`, which do not have a `.length` property. Adding `<T extends { length: number }>` uses structural typing: any type that satisfies the shape `{ length: number }` (strings, arrays, or objects with a numeric `length`) is accepted, while types lacking it are caught at compile time.',
      evaluationCriteria: [
        'Explains why unconstrained `T` cannot assume `.length` exists',
        'Explains structural shape checking with `T extends { length: number }`',
      ],
      topicIds: ['0.2.1'],
    },
    {
      id: '0.2-kc-3',
      focusArea: 'Promises',
      prompt:
        'A function returns `Promise<User>`. Does it immediately return a `User`? What does the `Promise` represent, and what does `await` actually give you?',
      hints: [
        'Think about what happens when a database query takes 200ms—is the `User` already in memory when the function returns?',
        'Contrast the container representing an eventual outcome with the unwrapped fulfilled value.',
        'It immediately returns a `Promise` object representing the eventual outcome (pending until it fulfills or rejects). Using `await` pauses that async function’s continuation until it settles and gives you the fulfilled `User` value.',
      ],
      explanation:
        'No—it immediately returns a `Promise` object, not a `User`. The `Promise` represents an asynchronous operation’s eventual outcome (pending, fulfilled, or rejected). Using `await` pauses the current async function until the Promise settles and unwraps the fulfilled `User` value (or throws if the Promise rejects).',
      evaluationCriteria: [
        'Clarifies that `Promise<User>` returns a Promise wrapper, not an immediate `User`',
        'Explains that `Promise` represents an eventual outcome and `await` produces the fulfilled value',
      ],
      topicIds: ['0.2.2'],
    },
    {
      id: '0.2-kc-4',
      focusArea: 'Async Functions',
      prompt:
        'You write `async function getAge(): Promise<number> { return 19; }`. Why is its return type `Promise<number>` instead of `number`? Does `await` block the entire JavaScript thread?',
      hints: [
        'Think about what the `async` keyword always guarantees about a function’s return value.',
        'Remember why JavaScript uses asynchronous operations instead of halting while waiting for I/O.',
        '`async` functions automatically wrap returned values in a fulfilled Promise (`Promise.resolve(19)`). `await` only suspends that specific async function’s continuation—the rest of the JavaScript thread keeps running.',
      ],
      explanation:
        'An `async` function always returns a Promise, automatically wrapping a plain return value like `19` in a fulfilled `Promise<number>` (conceptually `Promise.resolve(19)`). Meanwhile, `await` does not block the entire JavaScript thread—it only suspends the current async function’s continuation so other code and requests can continue executing.',
      evaluationCriteria: [
        'Explains automatic Promise wrapping by `async` functions',
        'Explains that `await` suspends only the current function, not the JS thread',
      ],
      topicIds: ['0.2.2'],
    },
    {
      id: '0.2-kc-5',
      focusArea: 'Typed Results',
      prompt:
        'Why is `Promise<User>` insufficient to describe both success and expected failure? How does `Promise<Result<User, UserError>>` improve the contract?',
      hints: [
        'Look at whether `Promise<User>` tells callers what happens if the user isn’t found and the function throws.',
        'Think about what `Result<T, E>` puts back into the TypeScript return type using a discriminated union.',
        '`Promise<User>` only types the fulfilled value and hides thrown errors. `Promise<Result<User, UserError>>` encodes both success and expected failures inside the return type so callers must narrow on the tag before reading `data` or `error`.',
      ],
      explanation:
        '`Promise<User>` only describes the fulfilled success value and does not encode thrown errors in its type signature, leaving expected failures invisible to callers. `Promise<Result<User, UserError>>` makes both outcomes explicit using generics and a discriminated union, forcing callers to check the `success` tag before accessing `data` or `error`.',
      evaluationCriteria: [
        'Identifies that `Promise<User>` only types the fulfilled path and hides thrown errors',
        'Explains how `Result<User, UserError>` makes expected success and failure explicit and compiler-checked',
      ],
      topicIds: ['0.2.2', '0.2.3'],
    },
    {
      id: '0.2-kc-6',
      focusArea: 'Putting Everything Together',
      prompt:
        'You’re building a generic API function that fetches different kinds of resources. It should return either the requested data or a structured error. Which concepts from this block would you combine, and what role would each play?',
      hints: [
        'Walk through the four requirements: reusable across resource types, asynchronous network wait, explicit success vs error outcomes, and safe branch checking.',
        'Name how each concept from Topics 1, 2, and 3 contributes one part of that design.',
        'Combine generics (`<T>`) for reusable resource typing (plus constraints if needed), `Promise` + `async`/`await` for the async network result, and a discriminated `Result<T, ApiError>` union to represent success vs structured error explicitly.',
      ],
      explanation:
        'You combine: (1) **Generics** (`<T>`, and constraints if specific fields are required) so the helper works across different resource types without losing their shape; (2) **`Promise` with `async`/`await`** to represent the asynchronous network request cleanly without blocking; and (3) a **typed `Result<T, ApiError>` discriminated union** so expected HTTP/API failures and successful payloads are both explicit and narrowed safely by callers (while leaving unexpected crashes to `try/catch`).',
      evaluationCriteria: [
        'Connects generics (reusability + type preservation), async/Promise (future result), and typed Result/discriminated union (explicit error vs data contract)',
        'Clearly explains the role each concept plays',
      ],
      topicIds: ['0.2.1', '0.2.2', '0.2.3'],
    },
  ],
};
