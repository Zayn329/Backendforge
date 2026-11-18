import { FptLessonContent } from '../types';

export const LESSON_1_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Before we dive into Node.js, let’s zoom out to the operating system underneath it. When you type `node server.js` in a terminal, nothing about TypeScript or JavaScript runs on bare metal by itself—the **operating system** has to bring that program to life.',
      'In this unit, we’ll trace that entire journey from first principles: **what a program on disk is**, **how the OS turns it into an isolated process with memory and file handles**, **how stack and heap memory work inside it**, and **how it cleans up on exit**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Every “out of memory” crash, “too many open files” error, zombie worker, or hanging shutdown in production comes down to how processes own memory and OS resources. Once you picture a process clearly, those errors stop feeling mysterious.',
    prerequisites: [
      {
        label: 'Running commands in a terminal',
        detail:
          'Having started a script or binary like `node app.js` and seen it print output or exit.',
      },
      {
        label: 'Basic picture of CPU and RAM',
        detail:
          'Knowing that disks store files long-term while RAM holds active data while a program is running.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-1.1.1',
      topicId: '1.1.1',
      coveredTopicIds: ['1.1.2'],
      title: 'From a file on disk to a running instance',
      problemAndRequirementsMarkdown: [
        '### First principles: Why isn’t a file on disk already running?',
        'Think of a compiled server binary—or even a Node.js executable paired with your script—sitting in a folder on your SSD. While it sits there, it uses **zero CPU** and **zero RAM**. It is just inert bytes on disk, like a recipe printed on paper.',
        '',
        'What happens if you open two terminals and run the *same* `node server.js` command twice (on different ports)? Suddenly two independent servers exist at the exact same time, serving different users and holding different variables.',
        '',
        '### Deriving the requirement',
        'That tells us two things must be distinct:',
        '1. **The static blueprint on disk** (the instructions and initial constants—one file).',
        '2. **A live execution instance in memory** (which can exist once, twice, or ten times independently).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Program vs. starting an executable',
        'A **program** is the passive file on disk containing machine instructions and initial static data.',
        '',
        'When you run that executable, the operating system does a fast setup sequence:',
        '1. **Reads the executable header**: Checks that the file is a valid program and finds where its instructions start.',
        '2. **Creates a fresh memory workspace**: Reserves space for the program’s instructions, static data, and working memory.',
        '3. **Loads the entry state**: Sets up command-line arguments (like `server.js`) and environment variables, then points the CPU’s instruction pointer at the program’s starting instruction.',
        '',
        'From that first instruction onward, the passive file has become an active, independent execution inside the OS.',
      ].join('\n\n'),
      codeExamples: [],
      centralIdeaSummary:
        'A program is a passive file of instructions on disk; starting it means the OS loads those instructions into a fresh workspace and points the CPU at its entry point.',
    },
    {
      id: 'topic-1.1.3',
      topicId: '1.1.3',
      coveredTopicIds: ['1.1.4'],
      title: 'What a process is and how the OS equips it',
      problemAndRequirementsMarkdown: [
        '### First principles: What else does a running program need besides CPU instructions?',
        'Suppose two programs run on your laptop at once: a Postgres database holding customer records and a Node.js API server handling web requests.',
        '',
        'Imagine if both programs had to talk directly to raw disk sectors, overwrite each other’s RAM, or fight over who owns the keyboard and network card. One buggy program could wipe out the database or steal its passwords!',
        '',
        '### Deriving the requirement',
        'To let dozens of programs share one physical computer safely, the OS needs a **containment boundary** around each running program—tracking who it is, what memory belongs to it, and which external resources it is allowed to touch.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: The OS process and its allocated resources',
        'That containment unit is a **process**—a running instance of a program managed by the operating system kernel.',
        '',
        'When the OS creates a process, it allocates and tracks a set of core resources for it:',
        '- **A Process ID (PID)**: A unique number identifying this running instance so the OS (and tools like `kill` or `top`) can refer to it.',
        '- **CPU execution state**: Space to save CPU registers and the instruction pointer whenever the OS pauses this process to let another one take a turn.',
        '- **An isolated memory space**: Memory regions where *only* this process can read and write.',
        '- **A file descriptor table**: Numbered handles connecting the process to outside I/O—files on disk, pipes, and network sockets. By convention, every new process starts with three standard handles already wired up: `0` (**stdin** for input), `1` (**stdout** for normal output), and `2` (**stderr** for errors).',
        '',
        'Notice that last bullet: a process cannot just grab an arbitrary file or network port on its own. It asks the OS kernel, and the kernel hands back a small integer **file descriptor** representing permission to use that resource.',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'When a Node.js backend opens too many unclosed files or database sockets, it hits the OS limit on its **file descriptor table** (`EMFILE: too many open files`), even if the machine still has plenty of RAM left.',
      codeExamples: [],
      centralIdeaSummary:
        'A process is an isolated running instance of a program, equipped by the OS with a PID, saved CPU state, private memory space, and a table of file descriptors for I/O.',
    },
    {
      id: 'topic-1.1.5',
      topicId: '1.1.5',
      coveredTopicIds: ['1.1.6'],
      title: 'Inside process memory: layout, stack, and heap',
      problemAndRequirementsMarkdown: [
        '### First principles: Why isn’t process memory just one flat bucket?',
        'Inside a running process, different pieces of data behave in completely different ways:',
        '- The compiled machine instructions never change while running—and shouldn’t accidentally be overwritten!',
        '- Local variables inside a helper function are created when the function starts and disappear the instant it returns.',
        '- A user cart or database result list grows dynamically and may need to stay alive long after the function that created it has returned.',
        '',
        'Putting all of these into one unstructured pile would make cleanup slow and bugs catastrophic.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Distinct memory regions',
        'To match those different lifetimes and permissions, the OS organizes a process’s memory into clear segments:',
        '```text',
        'High Addresses  ┌───────────────────────────────────────┐',
        '                │ OS Kernel Space (protected)           │',
        '                ├───────────────────────────────────────┤',
        '                │ Stack  ↓  (grows downward)            │',
        '                │   Function call frames & local vars   │',
        '                │                                       │',
        '                │         ... free gap ...              │',
        '                │                                       │',
        '                │   Dynamic objects & runtime buffers   │',
        '                │ Heap   ↑  (grows upward)              │',
        '                ├───────────────────────────────────────┤',
        '                │ Data / BSS (global & static variables)│',
        '                ├───────────────────────────────────────┤',
        'Low Addresses   │ Text (read-only executable code)      │',
        '                └───────────────────────────────────────┘',
        '```',
        'Let’s focus on the crucial comparison between **stack** and **heap**:',
        '- **The Stack (fast, automatic, short-lived)**: Functions call each other in strict last-in, first-out (LIFO) order: `main()` calls `parseRequest()`, which calls `validateEmail()`. When `validateEmail()` finishes, its variables are always the very next ones discarded. Allocating or freeing a stack frame is just moving one stack pointer up or down—practically instant! The catch: sizes must be predictable, and data vanishes when the function returns (and too much recursion overflows the stack).',
        '- **The Heap (flexible, longer-lived)**: What if `parseRequest()` builds an object whose size depends on user input, and returns it so the server keeps using it later? That cannot live in `parseRequest()`’s vanishing stack frame. It goes on the **heap**—a large pool where memory blocks can be allocated and freed in any order as needed.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '1.1.6-ex-1',
            title: 'Conceptual contrast: short-lived frame data vs longer-lived dynamic data',
            language: 'typescript',
            code: `function calculateDiscount(price: number, percent: number): number {
  // 'rate' and 'discount' exist only while calculateDiscount is running
  const rate = percent / 100;
  const discount = price * rate;
  return price - discount;
} // When this returns, its stack frame is immediately popped!

function createOrder(items: string[]) {
  // Dynamically sized list + object that must outlive createOrder()
  const order = {
    id: "ord_42",
    items: [...items],
  };
  return order; // Caller keeps using this object on the heap after createOrder returns
}`,
          },
          lineByLineMarkdown: [
            '- **`calculateDiscount`**: Uses simple temporary values tied strictly to the function call—the ideal fit for fast frame-based storage.',
            '- **`createOrder`**: Builds a dynamically sized `order` object that outlives the function call itself, which is why runtimes place objects like this on the heap.',
          ].join('\n'),
        },
      ],
      edgeCasesAndTradeOffsMarkdown:
        'Stack frames are tiny and fast but bounded in size (leading to `Maximum call stack size exceeded` on infinite recursion). Heap memory is roomy and flexible, but finding free gaps and cleaning up dead objects takes extra work (which runtimes handle with manual freeing or a garbage collector).',
      centralIdeaSummary:
        'Process memory separates read-only code and globals from two dynamic areas: the Stack (ultra-fast LIFO storage for active function calls) and the Heap (flexible storage for dynamically sized or longer-lived data).',
    },
    {
      id: 'topic-1.1.7',
      topicId: '1.1.7',
      coveredTopicIds: ['1.1.8'],
      title: 'Virtual memory isolation and clean process termination',
      problemAndRequirementsMarkdown: [
        '### First principles: How can two processes both use address `0x1000` without colliding?',
        'Here is a puzzle. Suppose Process A and Process B are compiled from the exact same code. Both store a variable at memory address `0x1000`.',
        '',
        'If processes wrote directly to physical RAM stick addresses, Process B would overwrite Process A’s data! Worse, a bug in a web server could read encryption keys straight out of a neighboring process’s RAM.',
        '',
        'And on the other end of a process’s life: what happens if a buggy script opens 500 files, allocates 400 MB of memory, and suddenly crashes? If cleanup depended on the crashing script remembering to tidy up after itself, the server would run out of RAM and files after a few crashes!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Virtual memory and OS cleanup on exit',
        'First, **virtual memory**: instead of giving processes direct physical RAM addresses, the OS gives *each* process its own private **virtual address space** starting from `0`.',
        '',
        'Behind the scenes, the OS kernel maintains a **page table** for each process, and a piece of CPU hardware called the **MMU (Memory Management Unit)** translates virtual addresses into real physical RAM chunks (called *pages* / *frames*) on every memory access:',
        '```text',
        'Process A virtual 0x1000 ──(MMU + A’s page table)──▶ Physical RAM frame #14',
        'Process B virtual 0x1000 ──(MMU + B’s page table)──▶ Physical RAM frame #89',
        '```',
        'Process A can *never* even name a virtual address that points to Process B’s private physical RAM. That is true hardware-enforced isolation—and it also lets the OS load pages from disk only when touched or swap inactive pages out when RAM gets tight.',
        '',
        'Second, **process termination**: when a process exits (normally via `return`/`process.exit(0)` or abnormally from an unhandled error or crash signal), the **OS kernel itself** performs the cleanup:',
        '1. Reclaims all virtual memory mappings and physical RAM pages owned by that process.',
        '2. Closes every open file descriptor (files, pipes, network sockets) in its descriptor table.',
        '3. Stores a small **exit code** (`0` usually means success; non-zero means failure) so the parent process that started it can read how it finished and clear its entry from the process table.',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'Process isolation is why a memory leak or crash in one worker process cannot corrupt another process’s memory, and why exiting with a non-zero code (like `1`) tells process managers, Docker, or Kubernetes that a server crashed and should be restarted.',
      edgeCasesAndTradeOffsMarkdown:
        'Virtual memory ensures the OS reclaims RAM and closes sockets when a process dies, *but* abrupt termination does not cleanly flush in-memory data to disk or finish an in-flight database transaction—which is why graceful shutdown (covered in 1.5) still matters.',
      codeExamples: [],
      centralIdeaSummary:
        'Virtual memory gives every process its own private address space mapped safely to physical RAM by the OS and CPU, while process termination lets the OS automatically reclaim memory, close descriptors, and report an exit status.',
    },
  ],
  conceptConnection: {
    title: 'Tracing a server process from start to exit',
    narrativeMarkdown: [
      'Now put the entire unit together by watching what happens when you launch a Node.js API:',
      '',
      '| Step | What happens at the OS level | Concept |',
      '| --- | --- | --- |',
      '| 1. `node api.js` typed in shell | Inert executable bytes on disk are loaded into RAM and pointed at entry point | Program → Startup |',
      '| 2. Kernel creates the instance | Assigns a PID, virtual address space, and `stdin`/`stdout`/`stderr` handles | Process & Resources |',
      '| 3. Server handles requests | Code sits in Text, request call chains push/pop on Stack, cached/parsed objects live on Heap | Memory Layout |',
      '| 4. Another app runs beside it | Separate page tables translate identical virtual addresses to separate physical RAM frames | Virtual Memory |',
      '| 5. Process exits with code `1` | Kernel closes open sockets/files, frees physical memory, and reports exit code to parent | Termination |',
    ].join('\n'),
    integratedExample: {
      id: '1.1-integrated-example',
      title: 'Full OS process lifecycle trace',
      language: 'text',
      code: `[Program on disk: /usr/bin/node + api.js]
        │
        ▼ (OS loads executable)
[Live Process: PID 4812]
  ├── Virtual Address Space (via MMU page tables -> isolated physical RAM)
  │     ├── Text (read-only instructions) + Data/BSS (globals)
  │     ├── Heap ↑ (objects, parsed JSON payloads, buffers)
  │     └── Stack ↓ (active function call frames)
  └── File Descriptor Table
        ├── fd 0: stdin   fd 1: stdout   fd 2: stderr
        └── fd 3: listening TCP socket, fd 4: log file...
        │
        ▼ (Process returns or crashes -> exit code 0 or 1)
[OS Kernel Cleanup]
  └── Closes fd 0..4, frees virtual/physical pages, hands exit code to parent`,
    },
    walkthroughMarkdown:
      'Every running backend is simply a kernel-managed process: isolated in its own virtual address space, executing calls on a stack with longer-lived state on a heap, talking to the outside world only through file descriptors, and fully reclaimed by the OS on exit.',
  },
  questions: [
    {
      id: '1.1-kc-1',
      focusArea: 'Program vs Process',
      prompt:
        'If you run `node server.js` in two separate terminals at the same time, you only have one script file on disk, yet the two servers don’t overwrite each other’s variables. Why? Distinguish between a **program** and a **process**.',
      hints: [
        'Compare the file sitting on your SSD vs what the OS creates each time you execute it.',
        'Think about how many instances exist on disk vs in memory.',
        'A program is a passive file on disk; each execution creates an independent OS process with its own PID, memory space, and file descriptors.',
      ],
      explanation:
        'A **program** is just a passive file of instructions on disk. Each time you run it, the OS creates a separate **process**—a live instance with its own PID, private virtual memory space, CPU state, and file descriptor table—so two instances of the same program stay completely independent.',
      evaluationCriteria: [
        'Defines program as passive file on disk vs process as active running OS instance',
        'Explains that each launch gets separate memory and resources',
      ],
      topicIds: ['1.1.1', '1.1.2', '1.1.3', '1.1.4'],
    },
    {
      id: '1.1-kc-2',
      focusArea: 'Process Resources',
      prompt:
        'Beyond memory for code and variables, why does the OS give every new process a **file descriptor table** (starting with `stdin`, `stdout`, `stderr`), and what error eventually happens if a server keeps opening files or sockets without closing them?',
      hints: [
        'Can a process talk directly to hardware like disks or network cards on its own?',
        'What tracks the open handles a process holds?',
        'Processes use OS-issued file descriptors for all I/O; leaking them fills the per-process table and causes "too many open files" failures.',
      ],
      explanation:
        'Because processes are isolated and cannot touch disks or network hardware directly, they request I/O through the OS kernel, which hands back numbered handles in a **file descriptor table** (`0` stdin, `1` stdout, `2` stderr, plus files and sockets). Leaking handles fills that table and prevents opening new files or accepting connections (`too many open files`).',
      evaluationCriteria: [
        'Explains file descriptors as kernel-mediated handles for I/O',
        'Connects unclosed files/sockets to exhausting the descriptor table',
      ],
      topicIds: ['1.1.4'],
    },
    {
      id: '1.1-kc-3',
      focusArea: 'Stack vs Heap',
      prompt:
        'Why is the **stack** so fast for local function variables, and why can’t dynamically sized objects that outlive a function call be stored on the stack?',
      hints: [
        'Think about the order in which nested function calls start and finish.',
        'What happens to a function’s stack frame the moment `return` runs?',
        'Stack frames enter and exit in strict LIFO order (just moving one pointer), whereas objects that resize dynamically or outlive the returning function would be wiped out when the frame pops, so they need the heap.',
      ],
      explanation:
        'Function calls finish in strict last-in, first-out (LIFO) order, so pushing and popping stack frames only moves a single pointer—making stack allocation almost free. However, the frame disappears when the function returns, so dynamically sized data or objects returned to callers for longer lifetimes must live on the **heap**.',
      evaluationCriteria: [
        'Links LIFO call order to fast pointer-based stack allocation/cleanup',
        'Explains why longer-lived or dynamically sized objects require the heap',
      ],
      topicIds: ['1.1.5', '1.1.6'],
    },
    {
      id: '1.1-kc-4',
      focusArea: 'Virtual Memory',
      prompt:
        'Suppose Process A and Process B both read and write to memory address `0x1000`. Why don’t they corrupt each other’s data? Explain the role of **virtual memory** and the **page table / MMU**.',
      hints: [
        'Are `0x1000` in Process A and `0x1000` in Process B pointing straight to the same spot on a physical RAM stick?',
        'How does the OS + CPU translate what a process asks for into real physical RAM?',
        'Each process sees its own virtual address space; the CPU’s MMU uses each process’s OS page table to translate virtual `0x1000` into completely separate physical RAM frames.',
      ],
      explanation:
        'Every process sees its own private **virtual address space**, not physical RAM. On memory accesses, the CPU’s **MMU** consults that process’s OS-managed **page table** to map Process A’s virtual `0x1000` and Process B’s virtual `0x1000` to two different physical RAM frames—giving hardware-enforced isolation.',
      evaluationCriteria: [
        'Distinguishes private virtual addresses from shared physical RAM',
        'Explains MMU/page-table translation per process',
      ],
      topicIds: ['1.1.7'],
    },
    {
      id: '1.1-kc-5',
      focusArea: 'Process Termination',
      prompt:
        'If a backend process crashes unexpectedly while holding 300 MB of heap objects and 50 open network sockets, are those 300 MB and 50 sockets leaked forever until you reboot the machine? Why or why not?',
      hints: [
        'Who actually owns the physical RAM page table and the file descriptor table on behalf of the process?',
        'What does the OS kernel do as soon as a process exits?',
        'No—the OS kernel tracks all process memory and descriptors, so upon termination it automatically reclaims the RAM, closes every open file descriptor, and exposes the exit code to the parent.',
      ],
      explanation:
        'No, they are not leaked forever. Because the **OS kernel** owns the process’s page tables and file descriptor table, as soon as the process terminates (normally or via crash), the kernel closes all 50 sockets, reclaims the 300 MB of physical RAM, and saves the exit code for the parent process.',
      evaluationCriteria: [
        'Identifies OS kernel automatic reclamation of memory and open descriptors on exit',
        'Mentions exit code reporting to the parent process',
      ],
      topicIds: ['1.1.8'],
    },
  ],
};

export const LESSON_1_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 1.1, we saw how the OS isolates each running program inside its own **process** with private memory. That isolation is great for safety—until a single program wants to do multiple things at once and share data smoothly.',
      'In this unit, we’ll explore **why threads were invented**, **how threads differ from processes in what they share and separate**, **how the OS schedules and switches between them**, **why shared memory causes race conditions and how locks prevent them**, and **the real difference between concurrency and parallelism**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Even though Node.js runs your JavaScript on one main thread, OS threads power Node’s background thread pool, Worker Threads, and multi-threaded runtimes/databases like PostgreSQL. Understanding race conditions and locks is essential whenever concurrent tasks touch shared state.',
    prerequisites: [
      {
        subBlockId: '1.1',
        label: 'Processes, memory segments, and virtual memory (1.1.3–1.1.7)',
        detail:
          'Knowing that each process has its own isolated virtual address space containing code, globals, heap, stack, and file descriptors.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-1.2.1',
      topicId: '1.2.1',
      coveredTopicIds: ['1.2.2', '1.2.3'],
      title: 'Why threads exist: shared kitchen, separate clipboards',
      problemAndRequirementsMarkdown: [
        '### First principles: Why weren’t multiple processes enough?',
        'Suppose you are building a server that needs to handle 20 connections at the same time and keep one shared in-memory lookup cache.',
        '',
        'You *could* start 20 separate processes. But think about the cost:',
        '1. **Heavyweight creation**: Each process gets a brand-new virtual address space, page table, and resource setup.',
        '2. **Hard data sharing**: Because virtual memory isolates processes, Process A cannot directly read a JavaScript object or cache sitting in Process B’s heap—they have to serialize bytes back and forth over pipes or sockets.',
        '',
        '### Deriving the requirement',
        'What we want is a way to have **multiple independent lines of execution inside the same process**—workers that easily share the same data when they cooperate, without duplicating the entire process.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Process vs. thread (shared vs. separate)',
        'That lighter-weight unit of execution is a **thread** (often called a thread of execution).',
        '',
        'Think of a **process** as a restaurant kitchen, and **threads** as chefs working inside it:',
        '- **What threads SHARE inside the same process**:',
        '  - The **heap** (all objects and dynamic data)',
        '  - Global/static variables (**Data/BSS**) and program code (**Text**)',
        '  - The process’s **open file descriptors** (files and sockets)',
        '- **What each thread gets SEPARATELY**:',
        '  - Its **own call stack** (because Chef A might be 4 function calls deep while Chef B is in a completely different function)',
        '  - Its **own CPU registers & instruction pointer** (so the OS knows exactly which line of code *that* specific thread is currently on)',
        '',
        '```text',
        'Process (One shared virtual address space)',
        '  ├── Shared: Code (Text), Globals, Heap, Open File Descriptors',
        '  ├── Thread 1 ──► [ Own Stack ] + [ Own Registers / PC ]',
        '  └── Thread 2 ──► [ Own Stack ] + [ Own Registers / PC ]',
        '```',
        'Because threads already live inside the same address space, creating a thread and sharing objects between threads is much lighter than spinning up a whole new process.',
      ].join('\n\n'),
      codeExamples: [],
      centralIdeaSummary:
        'Threads allow multiple independent paths of execution within one process: they share the heap, globals, code, and file descriptors, while each thread keeps its own private stack and CPU register state.',
    },
    {
      id: 'topic-1.2.4',
      topicId: '1.2.4',
      coveredTopicIds: ['1.2.5'],
      title: 'Context switching and thread scheduling',
      problemAndRequirementsMarkdown: [
        '### First principles: How do 50 threads run on a 4-core CPU?',
        'Open your computer’s activity monitor and you’ll often see hundreds of threads alive at once, even if your CPU only has 4 or 8 cores. Each CPU core can only execute **one** instruction stream at any exact instant.',
        '',
        'How does everything still feel responsive without 46 threads freezing until the first 4 exit?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Scheduling and context switching',
        'The OS kernel runs a **thread scheduler** that shares CPU cores across runnable threads using rapid turns (typically a few milliseconds each):',
        '1. **Running Thread 1**: Core 1 executes Thread 1’s instructions.',
        '2. **Time slice expires (or Thread 1 waits on disk/network)**: Notice how wasteful it would be for Core 1 to sit idle while Thread 1 waits 10ms for a disk read! The scheduler moves Thread 1 off the core.',
        '3. **Context switch**: To pause Thread 1 safely and resume it later without losing its place, the OS saves Thread 1’s CPU registers and instruction pointer into memory, loads Thread 2’s saved registers and instruction pointer onto the core, and lets Thread 2 run.',
        '',
        'Notice the difference in switching cost too: switching between two **threads in the same process** keeps the exact same virtual memory page table, whereas switching between two **different processes** also forces the CPU to swap memory mappings—making thread switches cheaper, though still **not free** (saving/restoring state and losing warm CPU caches still adds overhead if thousands of threads thrash back and forth).',
      ].join('\n\n'),
      codeExamples: [],
      centralIdeaSummary:
        'The OS scheduler multiplexes many threads onto limited CPU cores by pausing waiting or time-sliced threads and saving/restoring their register context during context switches.',
    },
    {
      id: 'topic-1.2.6',
      topicId: '1.2.6',
      coveredTopicIds: ['1.2.7'],
      title: 'Race conditions and locks',
      problemAndRequirementsMarkdown: [
        '### First principles: What goes wrong when two threads share memory?',
        'Sharing the heap makes communication fast—but it creates a subtle danger. Look at a line of code that seems totally harmless:',
        '```text',
        'balance = balance + 10   // starts at 100',
        '```',
        'To us, that looks like **one** single step. To a CPU, it is actually **three** separate steps:',
        '1. **Read** `balance` from memory (`100`).',
        '2. **Add** `10` in a CPU register (`110`).',
        '3. **Write** `110` back to `balance` in memory.',
        '',
        'Now imagine Thread A and Thread B both run `balance = balance + 10` around the same moment, and the OS scheduler pauses Thread A right after Step 1:',
        '```text',
        'Time 1: Thread A reads balance (100)',
        'Time 2: ── OS context switch! Thread B runs ──',
        'Time 3: Thread B reads balance (100), adds 10, writes 110',
        'Time 4: ── OS switches back to Thread A ──',
        'Time 5: Thread A still holds its old 100, adds 10, writes 110!',
        '```',
        'Two deposits of `10` just happened, yet `balance` is `110` instead of `120`. One update silently vanished!',
        '',
        '### Deriving the requirement',
        'That bug is a **race condition**: the final answer depends on lucky or unlucky timing of thread interleaving. We need a way to ensure that once one thread enters a sensitive **critical section** (the read-modify-write steps), no second thread enters until the first finishes.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Locks and synchronization',
        'To protect shared mutable state, threads use **synchronization** primitives—most commonly a **lock (mutex, short for mutual exclusion)**.',
        '',
        'Think of a lock like a single key to a single-person room:',
        '1. Before reading or updating `balance`, Thread A asks to **acquire** the lock. If the key is free, Thread A takes it and enters.',
        '2. If Thread B arrives while Thread A holds the lock, Thread B **waits** (blocks) instead of reading a half-finished `balance`.',
        '3. Thread A finishes all three steps (`read 100 → add 10 → write 110`) and **releases** the lock.',
        '4. Now Thread B wakes up, acquires the lock, reads the fresh `110`, adds `10`, and writes `120`.',
        '',
        'Correctness is restored—`balance` ends at `120` every single time.',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown: [
        '- **Contention slows concurrency**: While 10 threads wait in line for one lock, they cannot make progress in parallel on that shared data—so keeping critical sections short matters.',
        '- **Deadlocks**: If Thread 1 holds Lock A and waits for Lock B while Thread 2 holds Lock B and waits for Lock A, both wait forever unless locks are always acquired in a consistent order.',
      ].join('\n\n'),
      codeExamples: [],
      centralIdeaSummary:
        'Race conditions happen when concurrent threads interleave multi-step reads and writes on shared memory; locks restore correctness by enforcing mutual exclusion on critical sections, at the cost of waiting and deadlock risk if misused.',
    },
    {
      id: 'topic-1.2.8',
      topicId: '1.2.8',
      title: 'Concurrency vs parallelism',
      problemAndRequirementsMarkdown: [
        '### First principles: Are “concurrent” and “parallel” the same word?',
        'Developers often use *concurrency* and *parallelism* interchangeably—and it causes real confusion when debugging why adding async code didn’t speed up heavy math, or why a single-core machine can still run 50 programs.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Structure vs. physical execution',
        'Notice the crisp distinction:',
        '- **Concurrency** is about **handling multiple tasks in overlapping time periods** (managing progress across many things). Even on **one single CPU core**, an OS (or an event loop) can switch quickly between Task A and Task B so both advance without waiting for the other to finish completely.',
        '- **Parallelism** is about **physically executing multiple tasks at the exact same instant**—which requires **multiple CPU cores** (Core 1 running Task A while Core 2 simultaneously runs Task B).',
        '',
        'Look at how they relate:',
        '- **1 core juggling 3 threads**: Concurrent, *not* parallel (interleaved over time).',
        '- **4 cores running 4 threads at once**: Both concurrent *and* parallel.',
        '',
        'This distinction explains a huge architectural insight we’ll rely on in 1.4 and 1.5: Node.js gives you massive **concurrency** for waiting on I/O with a single JavaScript thread, *not* multi-core CPU **parallelism** unless you explicitly add threads or processes.',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'Knowing whether a bottleneck is waiting on slow I/O (helped by concurrency) or saturating a CPU core with heavy computation (which requires true multi-core parallelism) keeps you from adding the wrong scaling mechanism.',
      codeExamples: [],
      centralIdeaSummary:
        'Concurrency means managing multiple overlapping tasks (possible even on one core by interleaving), whereas parallelism means physically executing multiple tasks simultaneously across multiple CPU cores.',
    },
  ],
  conceptConnection: {
    title: 'Processes vs. threads at a glance',
    narrativeMarkdown: [
      'Here is how the concepts in this unit connect back to processes from Sub-block 1.1 and forward to Node.js:',
      '',
      '| Dimension | Multiple Processes | Multiple Threads (inside 1 Process) |',
      '| --- | --- | --- |',
      '| Memory sharing | Isolated virtual address spaces (must pass messages) | Share heap, globals, code, and open file descriptors |',
      '| Private state | Everything is private | Each thread has its own stack & CPU registers |',
      '| Context switch | Slower (changes virtual memory mappings too) | Faster (same address space), though still costs state save/restore |',
      '| Crash / bug risk | One crashing process cannot corrupt another’s memory | Shared-heap race conditions can corrupt data; needs locks/synchronization |',
    ].join('\n'),
    integratedExample: {
      id: '1.2-integrated-example',
      title: 'How threads share work safely vs unsafely inside one process',
      language: 'text',
      code: `Scenario: 2 CPU cores running 2 threads inside 1 server process (Parallel + Concurrent)

Shared Process Heap:
  counter = 0    lock = [unlocked]

Without Lock (Race Condition):
  Thread 1 reads counter (0) ──┐
  Thread 2 reads counter (0) ──┼─▶ Both compute 0 + 1 and write 1 (lost update!)

With Lock (Synchronized Critical Section):
  Thread 1 acquires lock -> reads 0 -> writes 1 -> releases lock
  Thread 2 waits...      -> acquires lock -> reads 1 -> writes 2 -> releases lock`,
    },
    walkthroughMarkdown:
      'Threads trade memory isolation for fast sharing: keeping separate stacks lets each thread run its own call chain, while locks protect shared heap mutations when the scheduler interleaves or runs threads in parallel.',
  },
  questions: [
    {
      id: '1.2-kc-1',
      focusArea: 'Shared vs Separate State',
      prompt:
        'Inside a single process with three running threads, which resources do all three threads **share**, and what must each thread have **separately** so they don’t tangle up which function they’re currently calling?',
      hints: [
        'Recall the kitchen analogy: one shared pantry vs each chef’s personal clipboard.',
        'If Thread 1 calls `login()` while Thread 2 calls `checkout()`, could they share one call stack?',
        'Threads share the heap, globals/code, and file descriptor table, while each thread gets its own private stack and CPU registers/instruction pointer.',
      ],
      explanation:
        'All threads inside the same process **share** the heap, code/globals, and open file descriptor table (making data sharing fast), while each thread has its **own stack** and **own CPU registers/instruction pointer** so each can follow an independent sequence of function calls.',
      evaluationCriteria: [
        'Correctly identifies shared resources (heap, globals/code, file descriptors)',
        'Correctly identifies per-thread resources (stack, CPU registers/instruction pointer)',
      ],
      topicIds: ['1.2.1', '1.2.2', '1.2.3'],
    },
    {
      id: '1.2-kc-2',
      focusArea: 'Scheduling & Context Switching',
      prompt:
        'Why can 40 threads stay responsive on a 4-core CPU without freezing, and what happens during a **context switch** when one thread pauses and another takes over the core?',
      hints: [
        'Does a thread keep a CPU core forever until it finishes, even while waiting on disk?',
        'What must the OS save so the paused thread can resume seamlessly later?',
        'The OS scheduler assigns short time slices (or switches when a thread waits for I/O); during a context switch it saves the current thread’s registers/instruction pointer and loads the next thread’s saved state.',
      ],
      explanation:
        'The OS scheduler divides CPU time into short slices and switches away whenever a thread waits for I/O. During a **context switch**, the kernel saves the outgoing thread’s CPU registers and instruction pointer into memory and restores the incoming thread’s saved state onto the core.',
      evaluationCriteria: [
        'Explains OS time-sliced / I/O-wait scheduling across limited cores',
        'Describes saving and restoring thread register/instruction state during context switch',
      ],
      topicIds: ['1.2.4', '1.2.5'],
    },
    {
      id: '1.2-kc-3',
      focusArea: 'Race Conditions',
      prompt:
        'Two threads both run `count = count + 1` starting from `count = 10`, yet after both finish, `count` is `11` instead of `12`. Trace the step-by-step interleaving that caused this **race condition**.',
      hints: [
        'Break `count = count + 1` into three separate CPU steps: read, add, write.',
        'Imagine the scheduler switches threads right after Thread 1 reads `10`.',
        'Both threads read `10` before either writes; Thread 2 writes `11`, then Thread 1 overwrites with its stale `11`, losing one increment.',
      ],
      explanation:
        '`count = count + 1` is three separate steps: read, add, write. If Thread 1 reads `10` and gets paused by the scheduler, Thread 2 can also read `10`, add `1`, and write `11`. When Thread 1 resumes, it still holds the stale `10` it read earlier and writes `11` too—silently losing Thread 2’s increment.',
      evaluationCriteria: [
        'Breaks the increment into separate read, modify, and write steps',
        'Traces how interleaving causes a stale overwrite (lost update)',
      ],
      topicIds: ['1.2.6'],
    },
    {
      id: '1.2-kc-4',
      focusArea: 'Locks & Trade-offs',
      prompt:
        'How does a **lock (mutex)** fix that lost update on `count`, and what are two downsides or risks of relying heavily on locks?',
      hints: [
        'Think about what a second thread must do if the first thread currently holds the lock.',
        'Consider throughput when many threads want the same lock, and what happens if two threads grab two locks in opposite order.',
        'A lock grants one thread exclusive access to the critical section so read-add-write completes before another enters; downsides are waiting/contention overhead and deadlocks if locks are acquired in conflicting orders.',
      ],
      explanation:
        'A lock enforces **mutual exclusion**: only the thread holding the lock may run the read-add-write critical section, forcing other threads to wait until it releases the lock and ensuring the next thread reads the updated value. The trade-offs are **contention** (threads waiting in line reduce throughput) and **deadlocks** (two threads waiting forever for locks held by each other).',
      evaluationCriteria: [
        'Explains mutual exclusion ensuring atomic completion of the critical section',
        'Identifies contention/waiting overhead and deadlock risk',
      ],
      topicIds: ['1.2.7'],
    },
    {
      id: '1.2-kc-5',
      focusArea: 'Concurrency vs Parallelism',
      prompt:
        'Can a program be **concurrent** on a single-core CPU? What makes execution truly **parallel**?',
      hints: [
        'Compare managing multiple overlapping tasks over time vs running instructions at the exact same instant.',
        'How many CPU cores are required for true physical simultaneity?',
        'Yes—concurrency interleaves multiple tasks over time even on 1 core, while parallelism executes two or more tasks at the exact same physical instant across multiple CPU cores.',
      ],
      explanation:
        'Yes. **Concurrency** is about managing multiple overlapping tasks—a single core can make concurrent progress by rapidly interleaving tasks over time. **Parallelism** requires multiple CPU cores physically executing instructions for different tasks at the exact same instant.',
      evaluationCriteria: [
        'Clarifies concurrency as overlapping/interleaved progress (works on 1 core)',
        'Defines parallelism as simultaneous execution across multiple CPU cores',
      ],
      topicIds: ['1.2.8'],
    },
  ],
};

export const LESSON_1_3: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Now that we understand how the operating system manages processes, stacks, heaps, and threads, let’s step inside **JavaScript itself**—specifically how the **V8 engine** (which powers both Chrome and Node.js) runs your code.',
      'In this unit, we’ll follow JavaScript execution from first principles: **how execution contexts, the call stack, and the heap work**, **how V8 interprets and JIT-compiles JS into machine code**, **how garbage collection frees unused memory**, and **how memory leaks still happen—and how heap snapshots catch them**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Knowing what lives on V8’s call stack versus its heap explains “Maximum call stack size exceeded” crashes, why mutating a shared object changes it everywhere, and how one forgotten array or event listener can steadily exhaust a Node.js server’s RAM.',
    prerequisites: [
      {
        subBlockId: '1.1',
        label: 'Stack vs heap memory (1.1.6)',
        detail:
          'Understanding LIFO function frames on a stack vs dynamically allocated objects on a heap.',
      },
      {
        subBlockId: '0.1',
        label: 'JavaScript runtime values (0.1.1)',
        detail:
          'Knowing that TypeScript erases types and V8 only executes runtime JavaScript.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-1.3.1',
      topicId: '1.3.1',
      coveredTopicIds: ['1.3.2', '1.3.3'],
      title: 'Execution contexts, the call stack, and object references on the heap',
      problemAndRequirementsMarkdown: [
        '### First principles: How does JavaScript keep track of “where we are” and “what variables exist”?',
        'Imagine JavaScript starts executing this tiny snippet:',
        '```javascript\nfunction addTax(price) {\n  const tax = price * 0.1;\n  return price + tax;\n}\n\nfunction checkout(item) {\n  const total = addTax(item.price);\n  return total;\n}\n\nconst shirt = { price: 50 };\ncheckout(shirt);\n```',
        'Notice two separate things JavaScript has to manage right now:',
        '1. When `checkout` calls `addTax`, JavaScript pauses `checkout`, runs `addTax` with *its own* `price` and `tax` variables, and then must know **exactly where inside `checkout` to return**!',
        '2. `shirt` is an object—if we pass `shirt` into `checkout` and `checkout` modifies `item.price`, why does the caller see the updated price too?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Execution context, call stack, and heap references',
        'Every time JavaScript begins running the top-level script or invokes a function, the engine creates an **execution context**—a small workspace holding that call’s local variables, parameters, `this` binding, and scope chain.',
        '',
        'To track nested calls, V8 pushes each execution context onto **one Call Stack** (remember LIFO from 1.1?):',
        '```text',
        '1. Script starts        2. checkout(shirt) called   3. addTax(50) called      4. addTax & checkout return',
        '┌──────────────────┐    ┌──────────────────┐        ┌──────────────────┐    ┌──────────────────┐',
        '│                  │    │                  │        │ addTax(50)       │    │                  │',
        '│                  │    │ checkout(shirt)  │        │ checkout(shirt)  │    │                  │',
        '│ Global Context   │    │ Global Context   │        │ Global Context   │    │ Global Context   │',
        '└──────────────────┘    └──────────────────┘        └──────────────────┘    └──────────────────┘',
        '```',
        'Notice why JavaScript is called **single-threaded** at the language level: there is **one Call Stack**, executing **one frame at the top at a time**. (If a recursive function calls itself endlessly without stopping, frames pile up until the stack hits its limit: `RangeError: Maximum call stack size exceeded`.)',
        '',
        'Now where did `{ price: 50 }` live? On the **Heap**! Local primitives like `50` or `tax = 5` can sit directly in the call’s stack frame, whereas objects, arrays, and closures sit on the **heap**—and the variable `shirt` (and parameter `item`) simply store a **reference (pointer)** to that same heap object.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '1.3.3-ex-1',
            title: 'Primitives vs heap object references',
            language: 'javascript',
            code: `// Primitives copy the value directly
let a = 10;
let b = a;
b = 20;
console.log(a); // 10 (a and b hold independent copies)

// Objects copy the reference pointing to the SAME heap object
const originalUser = { name: "Nadia", role: "viewer" };
const aliasUser = originalUser;
aliasUser.role = "admin";

console.log(originalUser.role); // "admin"! Both variables point to the same heap object`,
          },
          lineByLineMarkdown: [
            '- **Lines 2–5**: Assigning `b = a` copies the number `10`; changing `b` leaves `a` untouched.',
            '- **Lines 8–12**: Assigning `aliasUser = originalUser` copies only the **reference** to `{ name: "Nadia", role: "viewer" }` on the heap, so mutating `aliasUser.role` mutates the shared object visible through `originalUser`.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Each function call pushes an execution context onto V8’s single Call Stack; primitives live independently while objects live on the heap and variables hold references pointing to them.',
    },
    {
      id: 'topic-1.3.4',
      topicId: '1.3.4',
      coveredTopicIds: ['1.3.5'],
      title: 'How V8 executes JavaScript and why JIT compilation exists',
      problemAndRequirementsMarkdown: [
        '### First principles: Why doesn’t V8 either interpret everything or compile everything up front?',
        'JavaScript arrives as plain source text (`const total = a + b;`), whereas CPUs only understand binary machine instructions. Engines have two classic ways to bridge that gap—and both have a flaw on their own:',
        '1. **Pure interpreter** (read and execute one line at a time): Starts up almost instantly, *but* if a backend loop parses 50,000 rows, re-interpreting the exact same loop body 50,000 times is painfully slow.',
        '2. **Full ahead-of-time (AOT) compilation** (compile every function to machine code before running line 1): Produces very fast code, *but* makes startup slow and is hard in JavaScript because variables don’t have fixed runtime types (`add(a, b)` might get numbers 99% of the time, or strings once!).',
        '',
        '### Deriving the requirement',
        'We want **fast startup right away**, paired with **near-native speed for functions that actually run a lot**.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: V8’s interpreter + JIT pipeline',
        'V8 solves this by combining both approaches through **Just-In-Time (JIT) compilation**:',
        '1. **Parse into an AST & Bytecode**: V8 parses your JavaScript source and quickly turns it into compact **bytecode**—no slow full optimization wait before starting.',
        '2. **Interpret immediately while watching (“profiling”)**: V8’s interpreter runs the bytecode right away and quietly tracks which functions are called over and over (“hot” functions) and what runtime types they keep seeing (for instance, `price` is always a number).',
        '3. **JIT optimize hot functions**: Once a function gets hot, V8’s optimizing compiler compiles just that hot function into specialized, fast **native machine code** based on the shapes/types it observed.',
        '4. **Safe fallback (deoptimization)**: What if a caller suddenly passes a string into a hot function V8 optimized assuming numbers? V8 simply **deoptimizes**—discards that specialized assumption and safely drops back to bytecode without breaking JavaScript semantics!',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'Keeping object shapes consistent in hot backend paths (e.g., always creating response objects with the same properties in the same order rather than dynamically adding/deleting keys) helps V8’s JIT keep those paths fast.',
      codeExamples: [],
      centralIdeaSummary:
        'V8 starts fast by parsing JavaScript to bytecode and interpreting it immediately, then uses a JIT compiler to turn frequently run (“hot”) functions into fast machine code based on observed runtime types.',
    },
    {
      id: 'topic-1.3.6',
      topicId: '1.3.6',
      title: 'Garbage collection: automatic heap cleanup',
      problemAndRequirementsMarkdown: [
        '### First principles: Why doesn’t a Node.js server run out of heap memory after 100 requests?',
        'In languages like C, every heap allocation has to be manually freed by the programmer—forget once and memory leaks; free too early and your server crashes.',
        '',
        'In JavaScript, every HTTP request allocates objects, strings, and arrays on the heap—yet you never write `free(req)`. Who cleans them up, and how does the engine know for sure an object is safe to delete?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Reachability and Garbage Collection',
        'V8 uses a **Garbage Collector (GC)** built around one clean rule called **reachability**:',
        '> *If a heap object can still be reached by following references from live roots, keep it. If nothing live can reach it anymore, it is garbage and can be reclaimed.*',
        '',
        'What are the **roots**? Things guaranteed to be alive right now: the global scope and variables inside currently active frames on the **Call Stack**.',
        '```text',
        'Roots (Global + Active Stack Frames)',
        '   │',
        '   ├──▶ [Active Cache Object] ──▶ [Cached User]    (Reachable -> KEEP)',
        '   │',
        '   X    [Old Request Body]    ──▶ [Parsed Items]   (Unreachable -> COLLECT!)',
        '```',
        'Notice a smart optimization V8 also uses: most objects created during an HTTP request die milliseconds later when the request ends, whereas a few objects (like config or connection pools) live for hours. So V8 checks **young, short-lived objects** very frequently and cheaply, and checks **older, long-lived objects** much less often.',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown:
        'Garbage collection frees you from manual `free()` calls, *but* GC itself consumes CPU time—if a backend allocates millions of temporary objects per second, frequent GC pauses can cause latency spikes.',
      codeExamples: [],
      centralIdeaSummary:
        'Garbage collection automatically reclaims heap objects that are no longer reachable by references from live roots (globals and active stack frames).',
    },
    {
      id: 'topic-1.3.7',
      topicId: '1.3.7',
      coveredTopicIds: ['1.3.8'],
      title: 'Memory leaks and finding them with heap snapshots',
      problemAndRequirementsMarkdown: [
        '### First principles: If JavaScript has Garbage Collection, how can a memory leak still happen?',
        'Here is a classic surprise for backend engineers: a Node.js server passes every test, goes to production, and then every 6 hours its memory climbs from 150 MB → 500 MB → 1.5 GB until the OS kills it.',
        '',
        'Wait—didn’t we just learn that V8 has an automatic Garbage Collector? Why didn’t the GC free those objects?',
        '',
        '### Answering the paradox',
        'Remember GC’s rule: **GC only collects *unreachable* objects.** It cannot read your mind to know you *forgot* about an array! If your code accidentally leaves a reference from a live root pointing to old data you’ll never use again, GC sees it as **reachable** and dutifully keeps it forever.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Common leaks and Heap Snapshots',
        'In Node.js backends, memory leaks almost always come from three familiar patterns:',
        '1. **Unbounded global caches or arrays**: Pushing every request log, rate-limit key, or session into a module-level `Map` or `Array` without evicting old entries.',
        '2. **Forgotten event listeners or timers**: Attaching `emitter.on("data", handler)` per request without removing it keeps every listener—and any big object captured inside its closure—alive.',
        '3. **Closures capturing large buffers**: A tiny returned function kept alive somewhere can silently retain huge variables from its outer scope.',
        '',
        'How do you actually track down *which* object is growing? You take a **Heap Snapshot**—a complete freeze-frame map of every live object currently on V8’s heap, its size, and the exact chain of references (**retainers**) keeping it attached to a root.',
        '',
        'The practical debugging trick is taking **two snapshots over time** (for example, after 100 requests and again after 500 requests) and comparing them: whatever object count grew steadily between Snapshot 1 and Snapshot 2—and following its retainer path back to your `Map`, array, or listener—points straight to the leak.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '1.3.7-ex-1',
            title: 'Why GC cannot collect an unbounded cache vs bounded eviction',
            language: 'javascript',
            code: `// LEAK: module-level array is always reachable from module scope!
const recentRequestPayloads = [];

function handleRequestLeaky(payload) {
  recentRequestPayloads.push(payload); // Never removed -> memory grows forever
}

// FIXED: bound growth (or avoid retaining whole payloads in memory)
const MAX_RECENT = 100;
function handleRequestBounded(payload) {
  recentRequestPayloads.push(payload);
  if (recentRequestPayloads.length > MAX_RECENT) {
    recentRequestPayloads.shift(); // Drop oldest reference so GC can reclaim it
  }
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 2–6**: Because `recentRequestPayloads` stays reachable at module scope for the server’s entire life, every pushed `payload` stays reachable—so V8’s GC can never free it.',
            '- **Lines 10–14**: Evicting the oldest entry removes the last reference to it, making that old payload unreachable so GC collects it normally.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Memory leaks happen in garbage-collected runtimes when forgotten references (unbounded caches, listeners, closures) keep unneeded objects reachable; comparing heap snapshots reveals which objects keep growing and what retains them.',
    },
  ],
  conceptConnection: {
    title: 'How V8 executes and manages a Node.js request',
    narrativeMarkdown: [
      'Put all four pieces together as a single request runs inside Node.js:',
      '1. V8 parses your handler into bytecode and **JIT-compiles** hot request paths into fast machine code.',
      '2. Each function call pushes an **execution context** onto the single **Call Stack**, while parsed JSON objects sit on the **Heap** accessed via **references**.',
      '3. When the request finishes and stack frames pop, temporary request objects lose all references from roots and are swept away by **Garbage Collection**.',
      '4. If a module-level cache keeps a reference to every request object forever, GC cannot touch it—creating a **memory leak** you diagnose by comparing **Heap Snapshots**.',
    ].join('\n\n'),
    integratedExample: {
      id: '1.3-integrated-example',
      title: 'Tracing temporary GC objects vs retained leaked objects across requests',
      language: 'javascript',
      code: `const auditTrail = []; // Global/module root: lives forever

function processOrder(rawOrder) {
  // 'parsed' lives on the heap, referenced only by this stack frame
  const parsed = { id: rawOrder.id, total: rawOrder.price * rawOrder.qty };

  // Temporary objects die cleanly after return...
  // UNLESS a live root stores a reference to them:
  auditTrail.push(parsed); // Retainer path: Global -> auditTrail -> parsed!
}

processOrder({ id: 1, price: 25, qty: 2 });`,
    },
    walkthroughMarkdown:
      'Once `processOrder` returns, its Call Stack frame pops. Any local object *not* pushed into `auditTrail` becomes unreachable and is reclaimed by GC; anything pushed into `auditTrail` stays reachable from the module root and shows up in a Heap Snapshot comparison.',
  },
  questions: [
    {
      id: '1.3-kc-1',
      focusArea: 'Call Stack & Heap References',
      prompt:
        'Inside a function, `const a = { count: 1 }; const b = a; b.count = 5;`. Why does `a.count` become `5` even though you only changed `b`, and where do the object and the variables actually live?',
      hints: [
        'Compare what a variable stores for a primitive number vs for an object.',
        'Does `const b = a` clone `{ count: 1 }` on the heap?',
        'The object `{ count: 1 }` lives on the heap; `a` and `b` in the execution context both store references pointing to that single heap object.',
      ],
      explanation:
        'Execution contexts on the Call Stack hold local bindings `a` and `b`, while `{ count: 1 }` is allocated on the **heap**. Assigning `const b = a` copies only the **reference**, not the object itself—so both `a` and `b` point to the exact same heap object.',
      evaluationCriteria: [
        'Places the object on the heap and explains that variables store references',
        'Explains that copying the reference makes both variables alias the same heap object',
      ],
      topicIds: ['1.3.1', '1.3.2', '1.3.3'],
    },
    {
      id: '1.3-kc-2',
      focusArea: 'V8 & JIT Compilation',
      prompt:
        'Why does V8 start by running bytecode in an interpreter instead of ahead-of-time compiling every JavaScript file to machine code before line 1 executes, and when does the JIT compiler step in?',
      hints: [
        'Think about startup latency vs loop throughput, and about JavaScript’s dynamic types.',
        'What does V8’s profiler notice while the interpreter is running?',
        'Interpreting bytecode starts immediately without waiting to compile everything up front; as the profiler sees “hot” functions run repeatedly with consistent types, the JIT compiles those hot functions to optimized machine code.',
      ],
      explanation:
        'Compiling every file up front would delay startup and is hard without static runtime types. V8 parses JS to bytecode and **interprets immediately** for fast startup, while profiling which functions run repeatedly (“hot” paths) and **JIT-compiling** those hot functions to fast machine code using observed runtime types (with safe fallback if types change).',
      evaluationCriteria: [
        'Explains fast startup via bytecode interpretation',
        'Explains JIT optimizing hot functions using profiled runtime types',
      ],
      topicIds: ['1.3.4', '1.3.5'],
    },
    {
      id: '1.3-kc-3',
      focusArea: 'Garbage Collection',
      prompt:
        'How does V8’s Garbage Collector decide whether an object sitting on the heap can safely be deleted?',
      hints: [
        'Does GC inspect whether you wrote `delete` or whether your code "looks finished" with it?',
        'Think about starting from roots like globals and active Call Stack frames.',
        'GC uses reachability: starting from roots (global scope + active Call Stack frames), any heap object reachable through references is kept, while unreachable objects are collected.',
      ],
      explanation:
        'V8’s Garbage Collector determines liveness via **reachability**. Starting from live roots (global variables and active frames on the Call Stack), it traces all reachable references; any object on the heap with no path from a root is unreachable and can be safely reclaimed.',
      evaluationCriteria: [
        'Identifies reachability from roots (globals + active stack frames)',
        'Contrasts reachable (kept) vs unreachable (reclaimed)',
      ],
      topicIds: ['1.3.6'],
    },
    {
      id: '1.3-kc-4',
      focusArea: 'Memory Leaks in a GC Runtime',
      prompt:
        'If JavaScript has automatic Garbage Collection, why can a Node.js backend still suffer a memory leak when someone adds every request into a module-level cache `Map` or forgets to remove event listeners?',
      hints: [
        'Apply GC’s exact rule: can the GC delete an object that is still reachable from module scope?',
        'Does GC know the difference between an intentional cache and an accidentally forgotten list?',
        'Those objects remain reachable from live roots (module scope / active emitters), so GC sees them as still in use and never frees them.',
      ],
      explanation:
        'Garbage collection only frees *unreachable* objects—it cannot tell whether a reference is intentional or forgotten. Storing items in an unbounded module-level `Map` or leaving event listeners attached keeps those objects reachable from live roots forever, causing memory to grow steadily until the process runs out of RAM.',
      evaluationCriteria: [
        'Explains that leaks happen because unwanted objects remain reachable from roots',
        'Connects unbounded caches or unremoved listeners to kept references',
      ],
      topicIds: ['1.3.7'],
    },
    {
      id: '1.3-kc-5',
      focusArea: 'Heap Snapshots',
      prompt:
        'Your Node.js server’s RAM keeps climbing after every few thousand requests. Why is comparing **two heap snapshots** taken over time more helpful than just staring at one snapshot, and what does the **retainer** chain tell you?',
      hints: [
        'Think about separating normal steady-state objects (like libraries and config) from objects that keep accumulating.',
        'Once you see which object type grew, what do you need to know to fix the code?',
        'Comparing two snapshots reveals which objects keep growing rather than being collected; the retainer path shows the exact chain of references from a root keeping them alive.',
      ],
      explanation:
        'A single snapshot mixes normal steady-state objects with leaked ones. Comparing **two heap snapshots** (before and after load) isolates the objects whose count and size keep growing instead of being collected, and inspecting their **retainer** chain traces the exact reference path back to the cache, array, or listener preventing GC.',
      evaluationCriteria: [
        'Explains comparing two snapshots to spot growing uncollected objects',
        'Explains retainer paths as showing what root reference keeps leaked objects alive',
      ],
      topicIds: ['1.3.8'],
    },
  ],
};
