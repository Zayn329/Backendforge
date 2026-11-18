import { FptLessonContent } from '../types';

export const LESSON_1_4: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 1.3, we learned a crucial fact about JavaScript: V8 executes your JavaScript on **one Call Stack**, one frame at a time. That immediately raises a huge question: if Node.js only has one JavaScript thread, **how can a single Node server handle thousands of users at once without freezing everyone while one user waits on a database?**',
      'In this unit, we’ll answer that from first principles: **why blocking breaks servers**, **how asynchronous, event-driven I/O works**, **how the Event Loop, Task Queues, Microtasks, Promises, and `process.nextTick()` schedule callbacks**, **how `libuv`, the Thread Pool, and Worker Threads do background work**, and **how blocking or starvation silently stalls a server**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Every Node.js latency spike—“why did health checks time out even though CPU was low, or why did one heavy request freeze 500 other users?”—comes down to what ran on the Event Loop versus what was truly non-blocking.',
    prerequisites: [
      {
        subBlockId: '1.3',
        label: 'JavaScript’s single Call Stack (1.3.2)',
        detail:
          'Knowing that JavaScript runs functions sequentially on one Call Stack.',
      },
      {
        subBlockId: '0.2',
        label: 'Promises and async/await (0.2.2)',
        detail:
          'Understanding that a Promise represents a future outcome and `await` suspends only that async function’s continuation.',
      },
      {
        subBlockId: '1.2',
        label: 'Concurrency vs parallelism (1.2.8)',
        detail:
          'Distinguishing overlapping concurrent progress from simultaneous multi-core CPU execution.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-1.4.1',
      topicId: '1.4.1',
      coveredTopicIds: ['1.4.2', '1.4.3'],
      title: 'Why blocking breaks servers & event-driven asynchronous I/O',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens if a single-threaded server waits synchronously?',
        'Imagine User A sends a request that needs to query a database 150ms away across the network. Five milliseconds later, User B asks for a simple cached health check.',
        '',
        'If JavaScript used **synchronous (blocking) I/O**, the Call Stack would literally pause inside User A’s `queryDatabase()` call for the entire 150ms—doing *zero* work while waiting for bytes over the wire. User B (and Users C through Z) would just sit stuck outside, even though the CPU is 99% idle!',
        '',
        '### Deriving the requirement',
        'Because JavaScript has one main thread, it **cannot afford to sit idle waiting on slow disk or network I/O**. Instead, we need:',
        '1. A way to **start** an I/O operation and immediately return control to the Call Stack.',
        '2. A notification mechanism (**event-driven programming**) so the runtime can run our follow-up callback *when* the database or timer actually finishes.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Synchronous vs. Asynchronous, Event-Driven I/O',
        '- **Synchronous (blocking) I/O**: The thread asks the OS for data and sleeps until the data returns. Simple to read, terrible for one-threaded concurrency.',
        '- **Asynchronous (non-blocking) I/O**: JavaScript tells the underlying runtime, *“Ask the OS to read from this socket; when data arrives, call this function.”* That kickoff returns immediately, freeing the Call Stack to handle User B, User C, and User D right away.',
        '',
        'Notice what **event-driven programming** means here: instead of one long script pausing in place, your server reacts to events (“socket received bytes”, “timer expired”, “file finished reading”) by running small callbacks whenever each operation completes.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Blocking I/O stalls JavaScript’s single Call Stack while waiting on slow external hardware; asynchronous event-driven I/O starts operations immediately and reacts when completion events arrive, keeping the thread free for other requests.',
      codeExamples: [],
    },
    {
      id: 'topic-1.4.4',
      topicId: '1.4.4',
      coveredTopicIds: ['1.4.5', '1.4.6', '1.4.7'],
      title: 'The Event Loop, task queues, microtasks, Promises, and process.nextTick()',
      problemAndRequirementsMarkdown: [
        '### First principles: Once many async operations finish, in what order do their callbacks run?',
        'Suppose you kick off three things inside one function: a `setTimeout(..., 0)` timer, a `Promise.resolve().then(...)` continuation, and a `process.nextTick(...)` callback—plus a file read finishes around the same time.',
        '',
        'All four cannot jump onto the single Call Stack at once! We need a **fair, predictable coordinator** that waits until the Call Stack is empty and then decides which ready callback runs next.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: How the Event Loop drains queues',
        'That coordinator is the **Event Loop**. Here is the mental model that makes every async execution order clear:',
        '',
        '1. **Finish the active Call Stack first**: Nothing queued—no timer, no Promise, no I/O callback—can interrupt JavaScript code that is currently executing synchronously on the Call Stack.',
        '2. **Drain Microtask Queues completely next** (before moving to the next Event Loop phase!):',
        '   - First: **`process.nextTick()` queue** (a special Node-specific high-priority queue that drains right after the current operation finishes).',
        '   - Second: **Promise microtask queue** (`.then()`, `.catch()`, and code resuming after an `await`).',
        '   - *(Important: if a microtask schedules another microtask, it also runs before the loop moves on!)*',
        '3. **Run ready callbacks from Task Queues (Event Loop phases)**: Once microtasks are empty, the Event Loop moves through its regular task queues—timers (`setTimeout`/`setInterval`), completed OS I/O callbacks (sockets, files), and `setImmediate`—checking microtasks again after each step.',
        '',
        '```text',
        '[Current Call Stack finishes]',
        '        │',
        '        ▼',
        '1. Drain process.nextTick() queue',
        '        │',
        '        ▼',
        '2. Drain Promise Microtask queue (.then / await continuations)',
        '        │',
        '        ▼',
        '3. Pick next ready callback from Task Queues (Timers / I/O / Check)',
        '        └──────────────────────────(repeat)────────────────────────┘',
        '```',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '1.4.4-ex-1',
            title: 'Exact execution order: sync vs nextTick vs Promise vs timer',
            language: 'javascript',
            code: `console.log("1. sync start");

setTimeout(() => {
  console.log("5. timer task queue");
}, 0);

Promise.resolve().then(() => {
  console.log("4. promise microtask");
});

process.nextTick(() => {
  console.log("3. nextTick microtask");
});

console.log("2. sync end");`,
          },
          lineByLineMarkdown: [
            '- **Outputs `1` then `2` first**: Synchronous Call Stack code always finishes completely before any queued callback runs.',
            '- **Outputs `3` (`process.nextTick`) before `4` (`Promise`)**: Node drains `process.nextTick()` ahead of Promise microtasks.',
            '- **Outputs `4` (`Promise`) before `5` (`setTimeout`)**: All microtasks drain before the Event Loop proceeds to the timer task queue.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'After the Call Stack empties, Node drains `process.nextTick()` callbacks, then Promise microtasks, and only then picks up ready callbacks from the Event Loop’s timer and I/O task queues.',
    },
    {
      id: 'topic-1.4.8',
      topicId: '1.4.8',
      coveredTopicIds: ['1.4.9', '1.4.10'],
      title: 'Under the hood: libuv, the Thread Pool, and Worker Threads',
      problemAndRequirementsMarkdown: [
        '### First principles: If JavaScript has only one thread, WHO actually does the waiting and file reading?',
        'Wait a minute! Earlier we said JavaScript has only one Call Stack—yet `fs.readFile(...)` and `fetch(...)` run asynchronously without blocking JavaScript. *Something* in the process still has to watch network sockets and read files from the SSD!',
        '',
        'And what if your server genuinely needs to crunch heavy CPU work, like hashing passwords, compressing huge files, or resizing images for 500ms? Neither network async nor promises magically make CPU math run on another core!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: libuv, its Thread Pool, and Worker Threads',
        'V8 only executes JavaScript. Node.js pairs V8 with a C library called **`libuv`**, which owns the Event Loop and talks to the OS in two smart ways:',
        '',
        '1. **OS Kernel Non-Blocking I/O (for Network Sockets)**: Modern OS kernels can watch *thousands* of open TCP sockets simultaneously and alert `libuv` whenever bytes arrive on any of them—**without needing one thread per request**.',
        '2. **`libuv`’s Background Thread Pool (default 4 threads)**: Some tasks—like reading/writing disk files (`fs.*` async methods) or certain DNS and crypto calls—cannot always use simple non-blocking OS socket watchers across platforms. So `libuv` quietly hands those tasks to a small **Thread Pool** in C++. When a worker finishes reading the file, it hands the result back to the Event Loop to run your JS callback on the main thread.',
        '3. **Worker Threads (`node:worker_threads`) for YOUR heavy JS CPU work**: Remember that `libuv`’s internal pool runs C++ operations (`fs`, `crypto`, `zlib`), *not* your custom JavaScript loops! When you need to run heavy **JavaScript computation** (like parsing massive datasets or CPU-heavy transforms) across multiple CPU cores without freezing the main Event Loop, you spawn **Worker Threads**—each running its own isolated V8 instance and Event Loop on another core.',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'Because `libuv`’s default Thread Pool has only 4 threads, firing 20 heavy synchronous-style file reads or `crypto.pbkdf2` password hashes simultaneously queues the extra 16 behind the first 4 until a pool thread frees up—while thousands of network socket queries (`fetch`, Postgres) bypass the pool completely!',
      centralIdeaSummary:
        'libuv powers Node’s Event Loop using OS non-blocking watchers for network sockets and a background Thread Pool for async file/crypto/DNS work, while Worker Threads let you offload heavy JavaScript CPU tasks onto separate V8 threads.',
      codeExamples: [],
    },
    {
      id: 'topic-1.4.11',
      topicId: '1.4.11',
      title: 'Event-loop blocking and starvation',
      problemAndRequirementsMarkdown: [
        '### First principles: Two ways to quietly freeze a Node.js server',
        'Even if every database query in your app is `async`/`await`, two common mistakes can still bring a Node.js backend to its knees—and they look very different under the hood.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Blocking vs. Starvation',
        '1. **Event-Loop Blocking (hogging the Call Stack)**:',
        '   Suppose one request handler runs `fs.readFileSync()` on a 200 MB file, parses a gigantic 50 MB JSON string synchronously, or runs a `while` loop taking 800ms. Because there is only **one** Call Stack, the Event Loop literally cannot finish its turn and check I/O or timer queues until that 800ms finishes. Every other connected client stalls completely!',
        '2. **Event-Loop Starvation (flooding microtasks)**:',
        '   Remember Step 2 of the Event Loop? Microtasks (`process.nextTick()` and Promises) drain **completely** before the Event Loop moves on to timers or I/O callbacks. If a function recursively schedules `process.nextTick(repeat)`—or endlessly queues resolved Promises—the microtask queue never empties, so I/O sockets and timers **starve** and never run at all even though no single loop runs long!',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '1.4.11-ex-1',
            title: 'Blocking the Call Stack vs keeping the Event Loop responsive',
            language: 'javascript',
            code: `// BAD: Blocks the single Call Stack until the entire CPU loop completes
function slowReportSync(items) {
  let sum = 0;
  for (let i = 0; i < 5_000_000_000; i++) {
    sum += i;
  }
  return sum; // No other user request or timer can run during this!
}

// BETTER: Offload heavy JS computation to a Worker Thread (or chunk/stream it)
// so the main Event Loop keeps serving incoming HTTP requests cleanly.`,
          },
          lineByLineMarkdown: [
            '- **Lines 2–8**: While the `for` loop occupies the Call Stack, incoming requests sit unread in OS socket buffers and timers drift late.',
            '- **Takeaway**: Keep work per turn of the Call Stack tiny—use async APIs for I/O and Worker Threads for heavy CPU work.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Long synchronous tasks block the Event Loop on the Call Stack, while unbounded recursive microtasks or `process.nextTick()` calls starve the Event Loop so timers and I/O callbacks never get a turn.',
    },
  ],
  conceptConnection: {
    title: 'How Node.js handles 1,000 requests with one JavaScript thread',
    narrativeMarkdown: [
      'Now connect V8 (`1.3`), `libuv`, queues, and non-blocking I/O into one picture:',
      '',
      '| Workload Type | Where It Runs | Impact on Main Event Loop |',
      '| --- | --- | --- |',
      '| Network I/O (HTTP, DB sockets) | Handled via OS kernel non-blocking watchers in `libuv` | Minimal—JS callback only runs briefly when data is ready |',
      '| File I/O, DNS lookup, `crypto.pbkdf2` | Offloaded to `libuv`’s background C++ Thread Pool | Main JS stays free (though heavy pool load queues behind pool size) |',
      '| Short Promise / `await` continuation | Queued in Promise Microtask queue after Call Stack | Drains immediately before next timer/I/O phase |',
      '| Heavy JS computation (`JSON`, image math) | Runs on main Call Stack *unless* moved to Worker Threads | **Blocks** all other requests unless offloaded to Worker Threads |',
    ].join('\n'),
    integratedExample: {
      id: '1.4-integrated-example',
      title: 'Visualizing a non-blocking Node.js request lifecycle',
      language: 'text',
      code: `Request 1 arrives ──▶ Call Stack runs handler ──▶ awaits db.query() (libuv/OS socket)
                                                          │
   [Main Call Stack is NOW FREE!]                         │ (waiting on DB...)
                                                          │
Request 2 arrives ──▶ Call Stack runs health check ──▶ sends 200 OK immediately!
                                                          │
DB replies ────────▶ libuv queues callback ──▶ Event Loop runs it ──▶ Promise microtask resumes Request 1`,
    },
    walkthroughMarkdown:
      'Node.js scales I/O-heavy backends not by running JS code faster on 1 core, but by refusing to waste that 1 Call Stack waiting on slow networks and disks—delegating waiting to `libuv` and the OS, then resuming continuations cleanly through microtasks and task queues.',
  },
  questions: [
    {
      id: '1.4-kc-1',
      focusArea: 'Non-Blocking Event-Driven I/O',
      prompt:
        'Why does calling a synchronous file read (`fs.readFileSync`) inside an HTTP route hurt all other connected users, whereas the asynchronous version lets other requests proceed?',
      hints: [
        'Remember how many Call Stacks JavaScript has in the main Node.js thread.',
        'What is the Call Stack doing while waiting on the disk in the sync vs async case?',
        'Sync I/O freezes the single Call Stack until the disk finishes, stalling every other request; async I/O delegates the read to `libuv` and returns immediately so the Call Stack can serve other users.',
      ],
      explanation:
        'Because Node.js executes JS on one Call Stack, synchronous I/O forces that Call Stack to sit paused until the disk finishes—no other request or timer can run during that time. Asynchronous I/O hands the work to `libuv` and immediately returns control, allowing other requests to be served while waiting for the completion event.',
      evaluationCriteria: [
        'Links single Call Stack to blocking under synchronous I/O',
        'Explains returning control immediately with event-driven completion callbacks',
      ],
      topicIds: ['1.4.1', '1.4.2', '1.4.3'],
    },
    {
      id: '1.4-kc-2',
      focusArea: 'Queues & Execution Order',
      prompt:
        'In a single synchronous turn, you register `setTimeout(fnA, 0)`, `Promise.resolve().then(fnB)`, and `process.nextTick(fnC)`. In what order do `fnA`, `fnB`, and `fnC` run after the current Call Stack finishes, and why?',
      hints: [
        'Recall the two microtask queues that drain right after the Call Stack empties, before task queues.',
        'Which one runs first in Node.js: `process.nextTick()` or Promise `.then`?',
        '`fnC` (`nextTick`) runs first, then `fnB` (`Promise` microtask), then `fnA` (`setTimeout` timer task queue), because microtasks drain completely before the Event Loop enters the timer phase.',
      ],
      explanation:
        'They run in the order **`fnC` → `fnB` → `fnA`**. Once the synchronous Call Stack empties, Node drains the `process.nextTick()` queue first, then drains the Promise microtask queue (`fnB`), and only after all microtasks finish does the Event Loop move on to the timer task queue (`fnA`).',
      evaluationCriteria: [
        'Gives exact order: nextTick -> Promise -> setTimeout',
        'Explains microtask draining before advancing to task queues',
      ],
      topicIds: ['1.4.4', '1.4.5', '1.4.6', '1.4.7'],
    },
    {
      id: '1.4-kc-3',
      focusArea: 'libuv & Thread Pool vs Worker Threads',
      prompt:
        'Compare what **`libuv`’s Thread Pool** handles vs when you actually need **`Worker Threads`** in Node.js.',
      hints: [
        'Can your own heavy JavaScript loop (e.g., parsing huge arrays) automatically run inside `libuv`’s C++ pool?',
        'Contrast built-in async C++ operations (`fs`, `crypto`, DNS) with custom JS CPU work.',
        '`libuv`’s Thread Pool automatically runs built-in async C++ work that lacks non-blocking OS socket APIs (like file I/O and certain crypto), whereas Worker Threads run separate V8/JS threads for your own CPU-heavy JavaScript code.',
      ],
      explanation:
        '`libuv`’s internal Thread Pool handles specific built-in async C++ operations (like filesystem calls, certain crypto, and DNS) behind the scenes without blocking JS. However, your own JavaScript code always runs on the main Call Stack unless you move it—so **Worker Threads** spin up separate V8/JS threads on other cores to run CPU-heavy JavaScript without blocking the main Event Loop.',
      evaluationCriteria: [
        'Explains `libuv` thread pool handles built-in async non-socket C++ tasks',
        'Explains Worker Threads run separate JS/V8 threads for heavy custom CPU work',
      ],
      topicIds: ['1.4.8', '1.4.9', '1.4.10'],
    },
    {
      id: '1.4-kc-4',
      focusArea: 'Blocking vs Starvation',
      prompt:
        'Explain the difference between **blocking** the Event Loop and **starving** the Event Loop, giving one concrete example of each.',
      hints: [
        'Think about one giant synchronous step vs thousands of tiny highest-priority steps jumping the line.',
        'Recall how `process.nextTick()` behaves relative to I/O callbacks.',
        'Blocking hogs the Call Stack with long synchronous code (e.g., giant CPU loop or `readFileSync`); starvation endlessly schedules recursive `process.nextTick()`/microtasks so the Event Loop can never reach waiting I/O or timer queues.',
      ],
      explanation:
        '**Blocking** happens when synchronous CPU work or sync I/O (like a huge `for` loop or `fs.readFileSync`) occupies the single Call Stack so the Event Loop cannot advance at all. **Starvation** happens when code recursively queues microtasks or `process.nextTick()` callbacks—because Node drains microtasks completely before moving to task queues, timers and ready I/O callbacks are starved forever.',
      evaluationCriteria: [
        'Defines blocking as long synchronous work occupying the Call Stack',
        'Defines starvation as unbounded microtasks/nextTick preventing I/O and timer phases',
      ],
      topicIds: ['1.4.4', '1.4.7', '1.4.11'],
    },
  ],
};

export const LESSON_1_5: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Up to here, we’ve looked at single OS processes (`1.1`), threads (`1.2`), V8’s JS execution (`1.3`), and Node’s asynchronous Event Loop (`1.4`). Now let’s put on our production backend hat: **what happens when you actually run a Node.js service in production under real traffic, multi-core servers, deployments, and crashes?**',
      'In this unit, we’ll examine **the Node.js process lifecycle**, **single-process limits vs multi-process / Cluster scaling across CPU-bound and I/O-bound workloads**, **OS signals and graceful shutdown**, and **why uncaught exceptions and unhandled rejections must be handled safely**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'A server that works locally can still drop active user checkouts on every deployment, leave 7 of 8 CPU cores sitting idle, or limp along in a corrupted half-broken state after an uncaught crash if its process lifecycle isn’t designed properly.',
    prerequisites: [
      {
        subBlockId: '1.1',
        label: 'Processes, isolation, and termination (1.1.3–1.1.8)',
        detail:
          'Knowing that processes have isolated memory, file descriptors, and exit codes reclaimed by the OS.',
      },
      {
        subBlockId: '1.4',
        label: 'Node.js Event Loop & single Call Stack (1.4.4, 1.4.11)',
        detail:
          'Understanding that one Node.js process stays alive for active Event Loop handles and runs JS on one main Call Stack.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-1.5.1',
      topicId: '1.5.1',
      coveredTopicIds: ['1.5.2'],
      title: 'Node.js process lifecycle & single-process execution',
      problemAndRequirementsMarkdown: [
        '### First principles: How does Node know when to exit vs stay running?',
        'Notice something interesting if you run two different Node scripts:',
        '- Script A just prints `console.log("hello")` and immediately exits back to your terminal.',
        '- Script B calls `server.listen(3000)` and stays running indefinitely, even after reaching the bottom of the file!',
        '',
        'Why doesn’t Node exit at the last line of Script B?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Process lifecycle and active Event Loop handles',
        'A Node.js process follows a clear **lifecycle**:',
        '1. **Boot & Module Execution**: Starts V8 and `libuv`, runs your top-level JavaScript synchronously.',
        '2. **Event Loop Active Wait**: After top-level code finishes, Node asks `libuv`: *“Are there any active handles waiting for future events—like an open HTTP listening socket, an active timer, or pending I/O?”* As long as **yes**, the Event Loop keeps waiting and running callbacks.',
        '3. **Clean Exit**: Once zero active handles remain (or `process.exit()` is called), Node emits exit hooks and terminates with an exit code (`0` for clean exit, non-zero on crash).',
        '',
        'And remember what **single-process execution** means on modern hardware: one Node.js process has **one main Event Loop and one JavaScript Call Stack**. Even if your server machine has **8 CPU cores**, a single Node process executes JavaScript on **at most 1 core at a time** (aside from background `libuv` or explicit Worker Threads).',
      ].join('\n\n'),
      centralIdeaSummary:
        'A Node.js process stays alive as long as its Event Loop holds active handles (like a listening socket or timer), and by default executes JavaScript on a single main thread (one CPU core).',
      codeExamples: [],
    },
    {
      id: 'topic-1.5.3',
      topicId: '1.5.3',
      coveredTopicIds: ['1.5.4'],
      title: 'CPU-bound vs I/O-bound workloads & Cluster / multi-process models',
      problemAndRequirementsMarkdown: [
        '### First principles: Should you scale by adding processes—and when does it actually help?',
        'Suppose you deploy your API onto an 8-core server, and monitoring shows CPU Core #1 pinned at 100% while Cores #2–#8 sit completely idle at 0%.',
        '',
        'Before jumping straight to a solution, ask: *what kind of work is your endpoint actually doing?*',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: I/O-bound vs. CPU-bound & Multi-process / Cluster',
        'Look at the two workload profiles:',
        '- **I/O-bound workloads** (waiting on Postgres queries, Redis, external APIs, disk reads): Most request time is spent waiting over the network. A single Node Event Loop already handles thousands of concurrent I/O requests well—until JS serialization/routing itself saturates 1 core.',
        '- **CPU-bound workloads** (heavy JSON transformations, PDF generation, crypto, image/video work): The Call Stack is busy calculating on the CPU core. Even 100% async wrappers won’t speed it up on one Event Loop!',
        '',
        'To use all 8 cores for incoming HTTP traffic, production Node deployments use a **multi-process model**—either Node’s built-in **`cluster`** module (a primary process spawns multiple worker processes sharing the listening port) or a process manager / container orchestrator running multiple independent Node processes behind a load balancer:',
        '```text',
        'Incoming Traffic ──▶ Load Balancer / Cluster Primary',
        '                        ├──▶ Worker Process 1 (Core 1, own Event Loop & Heap)',
        '                        ├──▶ Worker Process 2 (Core 2, own Event Loop & Heap)',
        '                        └──▶ Worker Process 3 (Core 3, own Event Loop & Heap)',
        '```',
        '**Critical consequence from Sub-block 1.1**: Because each worker is a **separate OS process**, they have **isolated heaps**! If Worker 1 stores `sessions.set("user1", ...)` in a local JS `Map`, Worker 2 *cannot see it*. Shared multi-process state must live outside process memory (in a database or Redis).',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown:
        'Each extra Node process duplicates its own V8 heap and startup memory overhead—so running 4–8 processes on an 8-core machine makes sense, whereas running 200 processes wastes RAM and causes heavy OS context switching (`1.2`).',
      centralIdeaSummary:
        'Single Node processes scale I/O-bound concurrency well on one core, while Cluster or multi-process models distribute load across multiple CPU cores—requiring shared state to live outside process-local memory.',
      codeExamples: [],
    },
    {
      id: 'topic-1.5.5',
      topicId: '1.5.5',
      coveredTopicIds: ['1.5.6'],
      title: 'OS signals and graceful shutdown',
      problemAndRequirementsMarkdown: [
        '### First principles: What goes wrong when you kill a live server during a deployment?',
        'Imagine 40 users are mid-request right now—some just sent a payment `POST` whose database commit is 20ms away from finishing—when your deployment pipeline stops the old server container to launch the new version.',
        '',
        'If the old process dies instantly on the spot:',
        '- Those 40 HTTP responses snap shut mid-stream (`502 Bad Gateway` / connection reset).',
        '- Database connections drop abruptly without returning cleanly to the pool.',
        '- Background writes may leave work half-finished.',
        '',
        '### Deriving the requirement',
        'Instead of pulling the plug mid-sentence, the orchestrator needs a polite way to say: *“Stop taking new work, finish what you already started, clean up connections, and exit.”*',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Signals and Graceful Shutdown',
        'Operating systems communicate lifecycle events to running processes using **OS signals**:',
        '- **`SIGINT`**: Sent when you press `Ctrl+C` in a terminal.',
        '- **`SIGTERM`**: The standard polite shutdown request sent by Docker, Kubernetes, and process managers during deployments or scaling down. Your Node process can **listen** for `SIGTERM` and run cleanup logic!',
        '- **`SIGKILL`**: The emergency hard kill. A process **cannot** catch or ignore `SIGKILL`—orchestrators send it only if your process ignores `SIGTERM` for too long (e.g., 10–30 seconds).',
        '',
        'Here is the clean **Graceful Shutdown** sequence when `SIGTERM` or `SIGINT` arrives:',
        '1. **Stop accepting new connections**: Call `server.close(...)` so new incoming traffic goes to healthy instances while existing requests keep running.',
        '2. **Finish in-flight requests**: Wait until `server.close`’s callback fires (meaning active requests completed).',
        '3. **Close external resources**: Close database pools, Redis clients, and open file streams.',
        '4. **Safety timeout**: Start a fallback timer (e.g., 10 seconds) so a stuck request can’t hang shutdown forever until `SIGKILL` hits—then exit cleanly (`process.exit(0)`).',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '1.5.5-ex-1',
            title: 'Listening for SIGTERM / SIGINT to shut down gracefully',
            language: 'javascript',
            code: `let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return; // Ignore duplicate signals
  isShuttingDown = true;
  console.log(\`Received \${signal}, draining active requests...\`);

  // Safety net: force exit if cleanup hangs past 10 seconds
  const forceTimer = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
  forceTimer.unref(); // Do not keep Event Loop alive just for this timer

  server.close(async () => {
    await dbPool.end(); // Cleanly close DB connections once HTTP requests finish
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));`,
          },
          lineByLineMarkdown: [
            '- **Lines 4–5**: Guards against shutting down twice if `SIGTERM` arrives rapidly more than once.',
            '- **Lines 9–13**: Guarantees the process exits even if a broken socket hangs—and `.unref()` ensures that timer alone won’t stop the process from exiting once `server.close()` finishes early.',
            '- **Lines 15–18**: `server.close(...)` stops accepting new connections, lets in-flight requests complete, closes the database pool, and exits cleanly with code `0`.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Catching polite OS signals like `SIGTERM` lets a server stop accepting new connections, drain in-flight requests, close database pools, and exit cleanly before a hard `SIGKILL` arrives.',
    },
    {
      id: 'topic-1.5.7',
      topicId: '1.5.7',
      title: 'Uncaught exceptions and unhandled rejections',
      problemAndRequirementsMarkdown: [
        '### First principles: When a crash slips past every `try/catch`, should the server keep running?',
        'Suppose a bug throws an unexpected error synchronously and nothing catches it (**uncaught exception**), or an async Promise rejects and nobody attached `.catch()` or `await` inside a `try/catch` (**unhandled rejection**).',
        '',
        'It can be tempting to attach `process.on("uncaughtException", () => { /* ignore and keep serving! */ })` so the server “never goes down.”',
        '',
        'Wait—think carefully! Why is ignoring an uncaught crash and keeping the process running actually *worse* than restarting?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Why you log, fail fast, and restart cleanly',
        'An **`uncaughtException`** (synchronous error escaping the top of the Call Stack) or an **`unhandledRejection`** (a rejected Promise with no rejection handler) means your program jumped out of normal execution mid-operation:',
        '- Shared in-memory state or locks might be left half-updated.',
        '- Database connections, timers, or streams created before the throw may now be leaked forever.',
        '',
        'Keeping a wounded process alive leads to corrupted responses and mysterious silent leaks. Instead, production Node follows **fail-fast recovery**:',
        '1. Catch expected errors locally (`try/catch`, `Result`, route error middleware).',
        '2. Listen to `uncaughtException` and `unhandledRejection` strictly to **log the crash details immediately**, attempt a quick graceful close with a short timeout, and **exit with non-zero code `1`**—so your process manager or orchestrator spins up a fresh, clean process!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Uncaught exceptions and unhandled Promise rejections leave a process in an unknown, potentially corrupted state; log them clearly, shut down with a non-zero exit code, and let a process manager restart a clean instance.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Production lifecycle of a multi-process Node.js service',
    narrativeMarkdown: [
      'Now view the whole production picture from boot to deployment swap:',
      '1. An orchestrator or `cluster` primary launches **one process per CPU core** so CPU work and serialization scale across cores while external Redis/Postgres holds shared state.',
      '2. Inside each worker, active HTTP sockets keep its **Event Loop** alive serving **I/O-bound** traffic concurrently.',
      '3. If a bug triggers an **`uncaughtException` or `unhandledRejection`**, the worker logs it, closes cleanly if possible, and exits `1` so the manager replaces it cleanly.',
      '4. During normal deploys, **`SIGTERM`** initiates **graceful shutdown**—draining live requests, closing DB pools, and exiting `0` with zero dropped users.',
    ].join('\n\n'),
    integratedExample: {
      id: '1.5-integrated-example',
      title: 'Production lifecycle states: boot -> serve -> crash or graceful deploy',
      language: 'text',
      code: `[Orchestrator / Cluster] spawns 4 Node workers (1 per CPU core)
   │
   ▼ Each Worker Process:
   ├── Boot -> server.listen() (active handle keeps Event Loop alive)
   ├── Steady State -> serves I/O concurrently; shared state lives in DB/Redis
   │
   ├── Path A (Deploy / Scale Down): receives SIGTERM
   │     └── server.close() -> finish active requests -> close DB pool -> exit(0)
   │
   └── Path B (Unhandled Bug): uncaughtException / unhandledRejection
         └── log error -> fast cleanup / timeout -> exit(1) -> Orchestrator restarts clean worker`,
    },
    walkthroughMarkdown:
      'Production Node.js reliability rests on respecting process boundaries: scale horizontally across CPU cores without assuming shared RAM, drain requests cleanly on `SIGTERM`, and restart cleanly rather than limping along after uncaught crashes.',
  },
  questions: [
    {
      id: '1.5-kc-1',
      focusArea: 'Process Lifecycle & Single-Process Limits',
      prompt:
        'Why does a Node script with `console.log("hi")` exit immediately, whereas a script calling `server.listen(3000)` keeps running—and why can that single Node process still leave 7 out of 8 CPU cores unused?',
      hints: [
        'What does `libuv` check after top-level JavaScript finishes running?',
        'How many JavaScript Call Stacks does one default Node.js process have?',
        'Active Event Loop handles (like a listening socket) keep the process alive; a single Node process runs JS on one main thread, using at most one CPU core at a time for JS execution.',
      ],
      explanation:
        'A Node.js process stays alive as long as the Event Loop holds active handles (such as a listening HTTP socket or active timer); once none remain, it exits. Because a single Node process has only one main JavaScript thread / Call Stack, it executes JavaScript on at most one CPU core at a time, leaving other cores unused by default.',
      evaluationCriteria: [
        'Explains active Event Loop handles keeping the process running',
        'Explains single main JS thread utilizing only one CPU core',
      ],
      topicIds: ['1.5.1', '1.5.2'],
    },
    {
      id: '1.5-kc-2',
      focusArea: 'Multi-Process / Cluster & Shared State',
      prompt:
        'You scale a Node.js API across an 8-core server by running 8 worker processes (using `cluster` or a process manager). Why does an in-memory JavaScript `const rateLimits = new Map()` stop working consistently across users?',
      hints: [
        'Remember Sub-block 1.1: what does the OS enforce between separate processes?',
        'Where did Worker 1’s `Map` live compared to Worker 2’s `Map`?',
        'Each worker is an independent OS process with its own isolated heap/virtual memory, so updating `rateLimits` in Worker 1 isn’t visible to Worker 2—shared state needs an external store like Redis or a database.',
      ],
      explanation:
        'Every worker in a cluster or multi-process deployment is a separate OS process with its own **isolated virtual address space and V8 heap**. A `Map` updated inside Worker 1 cannot be read by Worker 2, so cross-process state (sessions, caches, rate limits) must be stored externally in Redis or a database.',
      evaluationCriteria: [
        'Identifies isolated per-process heaps/memory spaces',
        'Concludes shared state must live in external storage (Redis/database)',
      ],
      topicIds: ['1.5.3', '1.5.4'],
    },
    {
      id: '1.5-kc-3',
      focusArea: 'Signals & Graceful Shutdown',
      prompt:
        'During a deploy, your orchestrator sends **`SIGTERM`** before resorting to **`SIGKILL`**. Why shouldn’t a server just exit immediately on `SIGTERM`—and what are the key steps of a graceful shutdown?',
      hints: [
        'Think about users whose HTTP requests or database writes are halfway done when `SIGTERM` arrives.',
        'Trace the order: new connections, active requests, DB pools, and a safety timeout.',
        'Immediate exit drops active requests and leaks open DB connections; graceful shutdown stops accepting new connections (`server.close()`), finishes active requests, closes DB pools, and uses a safety timer before exiting `0`.',
      ],
      explanation:
        'Exiting instantly cuts off active HTTP responses and drops database connections mid-work. Graceful shutdown catches `SIGTERM` (note: `SIGKILL` cannot be caught), calls `server.close()` to stop taking new connections while letting in-flight requests finish, closes database pools, sets a safety force-exit timeout in case something hangs, and exits with code `0`.',
      evaluationCriteria: [
        'Explains dropping active requests/DB connections if exiting abruptly',
        'Outlines stopping new connections, draining in-flight requests, closing pools, and timeout guard',
      ],
      topicIds: ['1.5.5', '1.5.6'],
    },
    {
      id: '1.5-kc-4',
      focusArea: 'Uncaught Crashes',
      prompt:
        'Why is attaching `process.on("uncaughtException", () => { /* ignore and stay alive */ })` considered dangerous in production, and what should a Node process do instead upon an `uncaughtException` or `unhandledRejection`?',
      hints: [
        'When an exception escapes uncaught mid-request, can you trust in-memory variables, locks, or open sockets anymore?',
        'What can a process manager or orchestrator do if the broken process exits non-zero?',
        'Continuing after an uncaught crash risks corrupted state and leaked resources; the safe approach is logging the error, attempting a fast shutdown, and exiting non-zero (`1`) so the manager starts a clean process.',
      ],
      explanation:
        'An `uncaughtException` or `unhandledRejection` leaves execution mid-flow, meaning in-memory state may be half-updated and file/socket handles may be leaked. Silently ignoring it risks silent corruption; instead, log the failure, run a quick bounded shutdown if possible, and exit non-zero (`1`) so your process manager restarts a healthy process.',
      evaluationCriteria: [
        'Explains risk of corrupted state or leaked resources after unhandled failure',
        'Describes logging, bounded cleanup, and exiting non-zero for clean restart',
      ],
      topicIds: ['1.5.7'],
    },
  ],
};
