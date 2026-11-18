import { FptLessonContent } from '../types';

export const LESSON_2_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Up to this point, everything happened inside a single machine—processes, threads, V8, and the Event Loop. Real backends don’t live alone on one computer: browsers call APIs, APIs call databases, and services talk across cables, Wi-Fi, and data centers.',
      'In this unit, we’ll build networking from the ground up: **why computers network and the client-server model**, **how IP addresses, ports, DNS, and sockets find the right program**, **why TCP and UDP make different guarantees**, **how the TCP 3-way handshake and lifecycle work**, and **how retransmissions, timeouts, flow control, and congestion control keep data reliable**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Every connection timeout, DNS failure, `ECONNREFUSED`, and slow API request happens somewhere in these layers. When you understand sockets, DNS, and TCP, you can diagnose network failures methodically instead of guessing.',
    prerequisites: [
      {
        subBlockId: '1.1',
        label: 'Processes and file descriptors (1.1.3, 1.1.4)',
        detail:
          'Knowing that a process uses OS-managed file descriptors to talk to outside I/O like network sockets.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-2.1.1',
      topicId: '2.1.1',
      coveredTopicIds: ['2.1.2'],
      title: 'Why computers network & client-server communication',
      problemAndRequirementsMarkdown: [
        '### First principles: Why can’t every app just keep its data locally?',
        'If your store’s inventory or a chat app’s messages only lived inside each user’s phone RAM, Alice could never see Bob’s message, and two customers would buy the last concert ticket without knowing about each other.',
        '',
        'Computers need to **exchange messages across physical distance**. And when millions of phones and browsers want to read the same shared source of truth, having every phone talk directly to every other phone would be chaos.',
        '',
        '### Deriving the model',
        'So most backend systems organize into two roles: a **server** that stays running on a reachable address waiting for incoming requests, and **clients** (browsers, mobile apps, or other backend services!) that initiate requests whenever they need data or work done.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Client-Server communication',
        'In **client-server communication**:',
        '1. The **server** starts up, binds to a network address, and listens passively.',
        '2. A **client** actively reaches out across the network, sends a request, and waits for the server’s reply.',
        '3. Notice that “client” and “server” describe *roles in a conversation*, not fixed machines: your Node.js API acts as a **server** to a browser, and simultaneously acts as a **client** when querying PostgreSQL!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Networking lets separated machines share data and state; the client-server model splits roles between listeners (servers) and callers (clients).',
      codeExamples: [],
    },
    {
      id: 'topic-2.1.3',
      topicId: '2.1.3',
      coveredTopicIds: ['2.1.4', '2.1.5', '2.1.6'],
      title: 'Finding the right process: IP addresses, Ports, DNS, and Sockets',
      problemAndRequirementsMarkdown: [
        '### First principles: How does a request reach *your* Node.js process out of billions of programs worldwide?',
        'Think about sending a letter to an engineer who works in a giant office building:',
        '1. Humans remember `"Acme Corp"` better than `"742 Evergreen Terrace, Suite 400"`—but the postal truck needs the street address.',
        '2. The street address gets the letter to the **building**, not to the specific person inside (whose desk might be Suite 400 while the mailroom is Suite 100).',
        '3. Once delivered, both sides need an ongoing channel handle so replies go back to the exact right sender.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Four pieces working together',
        'Computer networks split that exact delivery problem into four clean layers:',
        '- **DNS (Domain Name System)**: The internet’s distributed phonebook. Humans type `api.acme.com`; DNS translates that domain name into a numeric IP address (and caches the answer temporarily using a **TTL**, or Time To Live, so every request doesn’t repeat the lookup).',
        '- **IP Address**: The **building address** identifying a host machine on the network (such as IPv4 `203.0.113.10` or IPv6 `2001:db8::1`). Routers use the IP address to hop packets across the internet to the right server.',
        '- **Port**: A 16-bit number (`0–65535`) identifying the **suite / specific listening process** on that machine. One server might run Postgres on port `5432`, Redis on `6379`, and your HTTPS server on `443`. Meanwhile, the client’s OS picks a temporary outbound port (like `51422`) so replies find the right browser tab or client process!',
        '- **Network Socket**: The OS-level **connection endpoint** (backed by a file descriptor in your process from Sub-block `1.1`). A live socket pairs `(local IP, local port, remote IP, remote port, protocol)` so bytes read from that descriptor come strictly from that peer.',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'When you see `ECONNREFUSED 127.0.0.1:5432`, DNS and IP succeeded (you reached the machine), *but* no process was listening on port `5432`. When DNS fails (`ENOTFOUND`), your client couldn’t even translate the domain name into an IP!',
      centralIdeaSummary:
        'DNS translates human names to IP addresses, IP routes packets to the target host machine, ports select the specific process on that host, and sockets give the OS process a descriptor to send and receive bytes.',
      codeExamples: [],
    },
    {
      id: 'topic-2.1.7',
      topicId: '2.1.7',
      title: 'TCP vs UDP: reliability vs raw speed',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens to packets out on the internet?',
        'The underlying IP layer only offers **best-effort packet delivery**: it splits data into small chunks (packets) and forwards them hop by hop across routers. Along the way, packets can get **dropped** (a busy router runs out of queue space), **duplicated**, or **reordered** (Packet 2 takes a faster path than Packet 1).',
        '',
        'Imagine sending a JSON payload or a SQL query over raw IP packets: if byte #140 disappears or Packet 2 arrives before Packet 1, your JSON fails to parse or your bank transfer corrupts!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Two transport choices',
        'Built right on top of IP are two very different transport protocols:',
        '- **TCP (Transmission Control Protocol)** — *Reliability first*: Before sending application data, TCP establishes a connection and gives you a **guaranteed, lossless, strictly ordered stream of bytes**. If any chunk goes missing or arrives out of order, TCP handles retransmission and reassembly silently before handing bytes to your code.',
        '- **UDP (User Datagram Protocol)** — *Speed and simplicity first*: UDP sends standalone messages (datagrams) with almost zero setup and **no retries or ordering guarantees**. If Packet 4 drops on a live video call or multiplayer game, you’d rather show Packet 5 right now than pause the whole video waiting to re-fetch old Packet 4!',
        '',
        'That is why web APIs, file transfers, and databases overwhelmingly rely on **TCP** (and why HTTP/3 carefully adds custom reliability on top of UDP—which we’ll look at in 2.3).',
      ].join('\n\n'),
      centralIdeaSummary:
        'TCP builds a reliable, ordered byte stream over lossy IP networks (ideal for APIs and databases), while UDP sends lightweight unordered datagrams with minimal latency (ideal when fresh packets matter more than retrying lost ones).',
      codeExamples: [],
    },
    {
      id: 'topic-2.1.8',
      topicId: '2.1.8',
      coveredTopicIds: ['2.1.9'],
      title: 'TCP connection lifecycle and the Three-Way Handshake',
      problemAndRequirementsMarkdown: [
        '### First principles: Why can’t a TCP client just start firing bytes immediately?',
        'Before trusting a two-way reliable stream over an unreliable network, both the client and server have to confirm two things:',
        '1. **Can I reach you, AND can you reach me back?** (Two-way communication works.)',
        '2. **What starting byte number are we each counting from?** (Sequence numbers so both sides detect missing or reordered bytes.)',
        '',
        'Notice why two messages wouldn’t be enough: if Client sends `"Hi"` and Server replies `"Hi back"`, the Server *still doesn’t know* whether its `"Hi back"` ever reached the Client!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: The 3-Way Handshake, Open Stream, and Teardown',
        'TCP solves setup cleanly in three steps—the **Three-Way Handshake**:',
        '```text',
        'Client                                    Server (listening on port)',
        '  │─────── 1. SYN (my start seq = x) ───────▶│',
        '  │◀────── 2. SYN-ACK (my seq = y, ack=x+1) ─│  Both paths & start numbers verified!',
        '  │─────── 3. ACK (ack = y+1) ──────────────▶│',
        '  │═════════ ESTABLISHED Byte Stream ════════│',
        '```',
        'Look closely at what just happened in one round-trip:',
        '1. **`SYN`**: Client proposes its starting sequence number `x` and asks to connect.',
        '2. **`SYN-ACK`**: Server confirms it heard `x` (`ack = x+1`) and proposes its own starting sequence number `y`.',
        '3. **`ACK`**: Client confirms it heard `y` (`ack = y+1`). Now *both* sides know the two-way channel is alive and synchronized.',
        '',
        '**Closing the connection**: When finished, each side sends a **`FIN`** (meaning *"I have no more bytes to send"*) and receives an **`ACK`**. The side that initiates the close also briefly enters a **`TIME_WAIT`** state (typically ~1–2 minutes) before completely forgetting the port pair, so any late stray packets floating around the network don’t accidentally get mixed into a brand-new connection on the same port.',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown:
        'Because opening a fresh TCP connection costs at least one full network round-trip for the 3-way handshake, backend clients use **persistent connections / connection pools** instead of re-handshaking on every single database query or HTTP call.',
      centralIdeaSummary:
        'TCP uses a 3-way handshake (SYN, SYN-ACK, ACK) so both sides confirm bidirectional reachability and starting sequence numbers, and closes each direction cleanly with FIN/ACK and a brief TIME_WAIT safety buffer.',
      codeExamples: [],
    },
    {
      id: 'topic-2.1.10',
      topicId: '2.1.10',
      coveredTopicIds: ['2.1.11'],
      title: 'Flow control, congestion control, retransmissions, and timeouts',
      problemAndRequirementsMarkdown: [
        '### First principles: Once connected, what keeps TCP from dropping data or flooding the receiver?',
        'Imagine a super-fast cloud server sending a 50 MB report to a slow mobile client over busy coffee-shop Wi-Fi. Three things can go wrong mid-stream:',
        '1. A packet gets lost on a noisy link.',
        '2. The fast server sends data faster than the slow phone’s application can read it out of RAM.',
        '3. Dozens of users push too much traffic through the same crowded router, causing packets to drop everywhere.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: TCP’s three self-healing protections',
        '- **Acknowledgements, Retransmissions & Timeouts**: Every byte sent carries a sequence number, and the receiver sends back **ACKs** saying how far it has received cleanly. When a sender sends data, it starts a **retransmission timer**. If no ACK arrives before the **timeout** expires (or if repeated duplicate ACKs signal a gap), TCP automatically **retransmits** the missing segment—and if the peer completely disappears, repeated timeouts eventually fail the connection instead of hanging forever.',
        '- **Flow Control (protecting the *receiver*)**: The receiver tells the sender how much free room remains in its receive buffer (its **receive window**). The sender guarantees it never keeps more unacknowledged bytes in flight than that buffer can hold, so a fast server cannot overrun a slow client’s memory.',
        '- **Congestion Control (protecting the *network*)**: Neither side can directly see every router in the middle—so TCP watches packet loss and round-trip delays as clues! The sender starts conservatively, gradually probes faster (**congestion window**), and immediately slows down if packet drops reveal that a router along the path is congested.',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'In backends, application-level **timeouts** still matter too: TCP retries dropped packets patiently, so if a dead peer vanishes silently without sending `FIN`, a socket without an explicit application or keep-alive timeout can stay stuck waiting for minutes.',
      centralIdeaSummary:
        'TCP guarantees delivery using sequence numbers, ACKs, and timeout-driven retransmissions, while flow control protects the receiver’s buffer and congestion control protects shared network routers.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Putting the network stack together for a backend call',
    narrativeMarkdown: [
      'When your Node.js API connects to `postgres.internal:5432`, every layer in this unit fires in sequence:',
      '1. **DNS** resolves `postgres.internal` → `10.0.2.15`.',
      '2. **IP + Port** target host `10.0.2.15` and listening database port `5432`.',
      '3. **OS Socket** allocates a file descriptor for `(localIP, ephemeralPort, 10.0.2.15, 5432, TCP)`.',
      '4. **TCP 3-Way Handshake** (`SYN` → `SYN-ACK` → `ACK`) opens a reliable ordered stream.',
      '5. **Retransmissions, Flow Control, and Congestion Control** keep SQL queries intact even across noisy or busy networks until `FIN` closes the connection.',
    ].join('\n\n'),
    integratedExample: {
      id: '2.1-integrated-example',
      title: 'Step-by-step trace of opening and using a TCP socket',
      language: 'text',
      code: `1. Name lookup:   DNS("api.example.com") ──▶ 203.0.113.10
2. OS Socket:     Creates fd socket -> binds local port 52104 -> targets 203.0.113.10:443
3. Handshake:     Client ──SYN──▶ Server ──SYN-ACK──▶ Client ──ACK──▶ ESTABLISHED
4. Steady Transfer:
     - Sender tracks sequence #s & retransmission timeouts (retries if ACK missing)
     - Receiver advertises Flow Control buffer limit (protects receiver RAM)
     - Sender scales Congestion Control rate on network loss/delay (protects routers)
5. Teardown:      FIN / ACK exchanged in both directions -> TIME_WAIT safety pause`,
    },
    walkthroughMarkdown:
      'Every network socket you open in Node.js rests on this exact stack: DNS finds the host, IP + port route to the process, TCP synchronizes state via three steps, and continuous ACKs plus dual rate controls keep the byte stream reliable.',
  },
  questions: [
    {
      id: '2.1-kc-1',
      focusArea: 'DNS, IP, Port & Socket',
      prompt:
        'A service connects to `https://payments.example.com:443`. Explain the distinct job of **DNS**, the **IP address**, the **port (`443`)**, and the **OS network socket**.',
      hints: [
        'Match each layer to: human-name lookup, target computer, specific program on that computer, and OS handle.',
        'What error happens if DNS fails vs if the server process isn’t listening on port 443?',
        'DNS translates the domain to an IP; IP routes packets to the host; port `443` selects the listening process on that host; the socket is the OS file-descriptor endpoint binding both IP/port pairs.',
      ],
      explanation:
        '**DNS** resolves `payments.example.com` into a numeric **IP address** (cached via TTL). The **IP address** routes packets across networks to that host machine. **Port `443`** tells that machine’s OS which listening process should receive the traffic. Finally, the **socket** is the OS endpoint (exposed as a file descriptor) associating `(local IP, local port, remote IP, remote port, protocol)`.',
      evaluationCriteria: [
        'Clearly separates DNS (name->IP), IP (host routing), Port (process selection), and Socket (OS endpoint)',
      ],
      topicIds: ['2.1.2', '2.1.3', '2.1.4', '2.1.5', '2.1.6'],
    },
    {
      id: '2.1-kc-2',
      focusArea: 'TCP vs UDP',
      prompt:
        'Why do database connections and REST APIs run on **TCP**, whereas live voice/video calls often prefer **UDP**?',
      hints: [
        'Compare what matters more when transferring SQL/JSON vs streaming live audio.',
        'What does TCP guarantee that UDP skips—and what latency price does retrying lost packets carry?',
        'APIs/DBs require every byte in exact order via TCP retransmissions; live audio prefers fresh frames via UDP rather than stalling playback to re-fetch an old lost packet.',
      ],
      explanation:
        '**TCP** guarantees an ordered, lossless byte stream using acknowledgements and retransmissions—essential when a missing or swapped byte would corrupt JSON or a database query. **UDP** skips handshakes, ordering, and automatic retries for minimal latency—ideal for live audio/video where a brief glitch is better than pausing real-time playback to retransmit old packets.',
      evaluationCriteria: [
        'Explains TCP reliability/ordering guarantees for APIs/DBs',
        'Explains UDP low-latency trade-off for real-time media',
      ],
      topicIds: ['2.1.1', '2.1.7'],
    },
    {
      id: '2.1-kc-3',
      focusArea: 'Three-Way Handshake',
      prompt:
        'Why does TCP open connections with a **three-way handshake** (`SYN`, `SYN-ACK`, `ACK`) instead of stopping after two messages (`SYN`, `SYN-ACK`)?',
      hints: [
        'Put yourself in the server’s shoes right after it sends `SYN-ACK`. What doesn’t it know yet?',
        'Remember both sides also need to agree on sequence numbers in both directions.',
        'After two steps, the server doesn’t know whether the client received its `SYN-ACK` and starting sequence number; the third `ACK` confirms bidirectional reachability before data flows.',
      ],
      explanation:
        'After `SYN` and `SYN-ACK`, the client knows both paths work, *but the server does not yet know* whether its `SYN-ACK` and initial sequence number actually reached the client. The third **`ACK`** confirms bidirectional reachability and synchronizes both sides’ starting sequence numbers.',
      evaluationCriteria: [
        'Explains server uncertainty after two steps',
        'Identifies bidirectional confirmation and sequence number synchronization',
      ],
      topicIds: ['2.1.8', '2.1.9'],
    },
    {
      id: '2.1-kc-4',
      focusArea: 'Flow Control vs Congestion Control',
      prompt:
        'Both **flow control** and **congestion control** slow down a fast TCP sender. How do they differ in *who* each mechanism is protecting?',
      hints: [
        'Imagine a tiny phone app reading slowly vs a crowded router shared by 1,000 users.',
        'One uses feedback directly from the peer’s buffer; the other infers trouble along the middle path.',
        'Flow control protects the specific receiver from its receive buffer overflowing; congestion control protects shared intermediate network links/routers from overload.',
      ],
      explanation:
        '**Flow control** protects the **receiver**: the receiver advertises how much free space is left in its memory buffer so the sender doesn’t overwhelm it. **Congestion control** protects the **network path (routers and links)**: the sender detects packet loss or delay signals and reduces its sending rate so shared internet links don’t collapse.',
      evaluationCriteria: [
        'Identifies flow control as protecting the receiver’s buffer',
        'Identifies congestion control as protecting shared network routers/links',
      ],
      topicIds: ['2.1.10'],
    },
    {
      id: '2.1-kc-5',
      focusArea: 'Retransmissions, Timeouts & Connection Teardown',
      prompt:
        'How does TCP recover silently when a router drops a packet mid-transfer, and why does closing a TCP connection wait briefly in **`TIME_WAIT`** instead of instantly reusing that port pair?',
      hints: [
        'Recall sequence numbers, ACKs, and timers on the sender side.',
        'What could happen if a delayed packet from the old connection arrived right after a brand-new connection reused the exact same ports?',
        'Missing ACKs trigger retransmission timeouts so the sender resends lost segments; `TIME_WAIT` holds the port briefly after `FIN` so delayed stray packets from the old stream aren’t misread by a new connection.',
      ],
      explanation:
        'Each TCP segment carries sequence numbers and expects an ACK before a retransmission timeout expires; if no ACK arrives, TCP automatically **retransmits** the lost bytes. On close (`FIN`/`ACK`), the active closer pauses in **`TIME_WAIT`** so any late, delayed packets still traveling the network expire harmlessly instead of corrupting a brand-new connection reusing the same IP/port tuple.',
      evaluationCriteria: [
        'Explains ACK + timeout-triggered retransmission on packet loss',
        'Explains TIME_WAIT preventing stray old packets from colliding with a new connection',
      ],
      topicIds: ['2.1.8', '2.1.11'],
    },
  ],
};

export const LESSON_2_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 2.1, we got bytes reliably from Client to Server over TCP. Here is the catch: **ordinary TCP sends those bytes in plain readable text!** Anyone sitting on the same Wi-Fi network, ISP router, or intermediate hop can read or alter every byte passing through.',
      'In this unit, we’ll derive **HTTPS and TLS** from first principles: **what threats encryption solves**, **why TLS combines asymmetric and symmetric cryptography**, **how public/private keys, Certificates, and Certificate Authorities prove identity**, and **how the TLS handshake establishes a secure HTTPS channel**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Production APIs cannot handle logins, tokens, or personal data without TLS. Understanding certificates and the TLS handshake lets you solve expired cert outages, self-signed certificate errors in internal services, and handshake latency.',
    prerequisites: [
      {
        subBlockId: '2.1',
        label: 'TCP sockets and 3-way handshake (2.1.8, 2.1.9)',
        detail:
          'Knowing that TCP first opens a reliable raw byte stream between client and server.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-2.2.1',
      topicId: '2.2.1',
      title: 'Why encryption is needed on a public network',
      problemAndRequirementsMarkdown: [
        '### First principles: What goes wrong if bytes travel unencrypted?',
        'Imagine logging into your bank over café Wi-Fi without encryption. Your TCP packets hop from your laptop → café router → local ISP → backbone routers → bank server.',
        '',
        'Notice **three separate threats** on any untrusted path:',
        '1. **Confidentiality (Eavesdropping)**: Any router or Wi-Fi snooper along the path reads your password, JWT token, or private customer data right out of the packet.',
        '2. **Integrity (Tampering)**: An attacker in the middle silently edits the response—say changing a download link or modifying a transfer amount—and neither side notices!',
        '3. **Authentication (Impersonation)**: Even if the wire is scrambled, how do you know the machine answering at the other end is *actually* `bank.com` and not an attacker pretending to be `bank.com`?',
        '',
        '### Deriving the requirement',
        'Secure communication must deliver **all three**: encrypted secrecy, tamper detection, and verified identity.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Confidentiality, Integrity, and Authentication',
        'Modern **TLS (Transport Layer Security)** wraps the TCP stream so that:',
        '- Every payload byte is scrambled (**confidentiality**) so eavesdroppers only see random-looking ciphertext.',
        '- Every message carries cryptographic integrity checks (**integrity**) so modifying even one bit breaks verification and gets rejected.',
        '- The server proves its identity using cryptographic keys and certificates (**authentication**) before you send your credentials.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Plain TCP exposes traffic across intermediate routers; secure communication requires confidentiality against eavesdropping, integrity against tampering, and authentication against impersonation.',
      codeExamples: [],
    },
    {
      id: 'topic-2.2.2',
      topicId: '2.2.2',
      coveredTopicIds: ['2.2.3'],
      title: 'Symmetric vs asymmetric cryptography and public/private keys',
      problemAndRequirementsMarkdown: [
        '### First principles: How do two strangers agree on a secret key over a public wire?',
        'Suppose you encrypt data using **symmetric cryptography**: both the client and server lock and unlock messages with the **exact same secret key** (like two copies of the same house key).',
        '',
        'Symmetric encryption is blazingly fast—perfect for encrypting gigabytes of API responses. **Wait—there is a huge catch!** How do your browser and `api.example.com` get the *same* secret key in the first place if they’ve never met and an eavesdropper is listening to every packet they send?',
        '',
        'If the server simply sends the secret key over plain TCP, the eavesdropper steals the key too!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Asymmetric keys solve the key-sharing problem',
        'That puzzle is solved by **asymmetric (public-key) cryptography**, which uses a mathematically linked **key pair**:',
        '- **Public Key**: Shared openly with the entire world.',
        '- **Private Key**: Kept strictly secret on the server—never transmitted over the network.',
        '',
        'Two magical properties make asymmetric keys work:',
        '1. **Key exchange / sealing**: Data locked (or a key-exchange step performed) with the public key can *only* be unlocked by its matching **private key**.',
        '2. **Digital signatures**: If the server signs a piece of data using its **private key**, *anyone* holding its **public key** can verify that only the owner of the private key could have created that signature!',
        '',
        'Wait—if asymmetric cryptography can encrypt and sign, why not use it for *every* HTTP request forever? **Because asymmetric math is much slower** than symmetric math! So TLS uses the best of both worlds:',
        '1. Use **asymmetric** cryptography briefly during setup to verify identity and safely establish a shared **symmetric session key**.',
        '2. Switch to fast **symmetric** cryptography for the entire rest of the connection!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Asymmetric key pairs (public + private) solve identity proof and secret sharing over untrusted wires, after which both sides switch to fast symmetric session keys for bulk encrypted traffic.',
      codeExamples: [],
    },
    {
      id: 'topic-2.2.4',
      topicId: '2.2.4',
      coveredTopicIds: ['2.2.6'],
      title: 'Certificates, Certificate Authorities, and verification',
      problemAndRequirementsMarkdown: [
        '### First principles: How do you know a public key actually belongs to `api.bank.com`?',
        'Hold on—there’s still one sneaky attack! Suppose you connect to `api.bank.com`, and an attacker intercepts your connection, generates their *own* public/private key pair, and hands you *their* public key saying: *"Hi, I’m `api.bank.com`!"*',
        '',
        'Encryption alone wouldn’t save you—you’d just have an encrypted tunnel straight to the attacker!',
        '',
        '### Deriving the requirement',
        'You need a **trusted third party**—someone your laptop or server already trusts out of the box—to vouch that *“Yes, this specific public key really belongs to `api.bank.com`.”*',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Digital Certificates & Certificate Authorities (CAs)',
        'That trusted third party is a **Certificate Authority (CA)**—think of it like a government passport office. Your operating system, browser, and Node.js ship pre-loaded with a small list of **trusted root CAs**.',
        '',
        'To prove its identity, a server presents an **SSL/TLS Certificate**, which bundles:',
        '- The domain name(s) it belongs to (e.g., `api.bank.com`)',
        '- The server’s **public key**',
        '- An **expiration date**',
        '- A **digital signature** created by a trusted CA’s own private key',
        '',
        'During **Certificate Verification**, the client checks **all three** before trusting the server:',
        '1. **Trusted Signature Chain**: Can this certificate’s signature be verified up to one of the trusted root CAs already on my machine?',
        '2. **Hostname Match**: Does the certificate explicitly list the exact domain (`api.bank.com`) I tried to reach?',
        '3. **Validity Window**: Is today’s date inside the certificate’s not-before / not-after dates (not expired)?',
        '',
        'If an attacker swaps in their own key, they can’t forge a trusted CA’s signature for `api.bank.com`—so verification immediately fails!',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'Expired certificates, hostname mismatches, or self-signed certificates in internal staging clusters trigger immediate `CERT_HAS_EXPIRED` or `SELF_SIGNED_CERT_IN_CHAIN` errors in Node.js clients—never disable verification globally (`NODE_TLS_REJECT_UNAUTHORIZED=0`) in production, as that silently turns off the authentication check!',
      centralIdeaSummary:
        'Certificates bind a domain name to a public key via a trusted Certificate Authority’s signature; clients enforce trust by verifying the CA chain, domain hostname match, and expiration dates.',
      codeExamples: [],
    },
    {
      id: 'topic-2.2.5',
      topicId: '2.2.5',
      coveredTopicIds: ['2.2.7'],
      title: 'The TLS handshake and HTTPS connection establishment',
      problemAndRequirementsMarkdown: [
        '### First principles: Put TCP, certificates, and both key types into exact sequence',
        'When your browser or Node service visits `https://api.example.com/orders`, how do TCP (`2.1`), certificates, and cryptography fit together before a single HTTP byte is sent?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: TLS Handshake → HTTPS',
        '**HTTPS** isn’t a completely separate replacement for HTTP—it is simply **HTTP running inside an encrypted TLS tunnel over TCP**!',
        '',
        'Look at the exact sequence to establish an HTTPS connection:',
        '```text',
        'Client                                               Server (port 443)',
        '  │◀══ Step 1: TCP 3-Way Handshake (SYN / SYN-ACK / ACK) ══▶│  Raw reliable socket ready',
        '  │                                                         │',
        '  │─── ClientHello (supported TLS versions + ciphers) ─────▶│',
        '  │◀── ServerHello + Certificate + Proof of Private Key ───│  Step 2: TLS Handshake',
        '  │    [Client verifies CA chain, hostname & expiry!]       │',
        '  │─── Key-exchange / Finished (both derive session key) ──▶│',
        '  │                                                         │',
        '  │◀══ Step 3: Encrypted HTTPS (HTTP inside symmetric TLS) ═│',
        '```',
        'Walk through Step 2 carefully:',
        '1. **Negotiate capabilities (`ClientHello` / `ServerHello`)**: Both sides agree on the TLS version and cipher algorithms they both support.',
        '2. **Authenticate server**: Server sends its **Certificate** *plus* a fresh signature proving it actually possesses the matching **private key** (so nobody can just copy someone else’s public certificate file and impersonate them!).',
        '3. **Verify & derive shared secret**: Client verifies the CA signature, domain name, and dates, verifies the server’s signature, and both sides independently compute the exact same **symmetric session key** without ever sending that key in plaintext.',
        '4. **Encrypted HTTP begins**: From now on, every HTTP method, URL, header, cookie, and JSON body travels encrypted and integrity-protected by that symmetric session key.',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown:
        'Notice the latency cost: TCP takes 1 round-trip (`SYN` → `SYN-ACK` → `ACK`), and TLS adds another ~1–2 round-trips before the first HTTP request leaves! Reusing persistent HTTPS connections (or TLS session resumption) avoids paying those extra round-trips on every API call.',
      centralIdeaSummary:
        'HTTPS runs HTTP inside a TLS-encrypted TCP connection established via a TLS handshake that authenticates the server’s certificate and private key and derives a shared symmetric session key.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'How each cryptographic piece stops a real attack',
    narrativeMarkdown: [
      'Notice how every concept in Sub-block 2.2 answers one specific failure from the start of the lesson:',
      '',
      '| Security Problem | Mechanism in TLS / HTTPS |',
      '| --- | --- |',
      '| Snooping on Wi-Fi / ISP routers | Fast **symmetric session key** encrypts all HTTP payloads |',
      '| Sharing that secret key safely over an untrusted wire | **Asymmetric key agreement** establishes the session key without transmitting it raw |',
      '| Attacker impersonating `bank.com` with a fake key | **CA-signed Certificate** + **signature proving private key possession** |',
      '| Fake or expired certificate | **Certificate Verification** checks CA trust chain, domain name, and expiry |',
    ].join('\n'),
    integratedExample: {
      id: '2.2-integrated-example',
      title: 'Complete HTTPS security verification flow',
      language: 'text',
      code: `1. TCP opens raw connection to api.bank.com:443
2. TLS ClientHello -> ServerHello + Certificate(public key for api.bank.com, signed by CA)
3. Server signs handshake transcript with its PRIVATE key
4. Client verifies:
     [x] Signed by a trusted root CA?
     [x] Domain matches "api.bank.com"?
     [x] Not expired?
     [x] Handshake signature verifies with certificate's PUBLIC key?
5. Both sides compute identical SYMMETRIC session key
6. HTTP Request ("GET /balance", Authorization header) flows encrypted & tamper-proof`,
    },
    walkthroughMarkdown:
      'Without certificates, asymmetric keys can still be impersonated; without asymmetric keys, symmetric keys can’t be safely shared; without symmetric keys, bulk encryption would be too slow. TLS snaps all three together before the first HTTP header is sent.',
  },
  questions: [
    {
      id: '2.2-kc-1',
      focusArea: 'Why Encryption Is Needed',
      prompt:
        'Beyond hiding passwords from eavesdroppers on public Wi-Fi, what are the other **two** core security guarantees TLS provides for an HTTPS request?',
      hints: [
        'Suppose traffic is scrambled—what if someone alters bytes in transit, or what if you’re talking to an imposter’s server?',
        'Think of the three pillars: confidentiality, ______, and ______.',
        'Integrity (detecting any tampering or modification of messages in transit) and authentication (verifying you are genuinely talking to the real server).',
      ],
      explanation:
        'In addition to **confidentiality** (preventing eavesdroppers from reading traffic), TLS guarantees **integrity** (cryptographically detecting if an attacker altered bytes in transit) and **authentication** (proving the server really owns the target domain rather than being an imposter).',
      evaluationCriteria: [
        'Identifies integrity against tampering',
        'Identifies authentication against impersonation',
      ],
      topicIds: ['2.2.1'],
    },
    {
      id: '2.2-kc-2',
      focusArea: 'Symmetric vs Asymmetric Cryptography',
      prompt:
        'Why doesn’t TLS just encrypt the entire HTTP connection using **only symmetric** encryption—or **only asymmetric** encryption?',
      hints: [
        'Think about the problem symmetric keys have at step 1 when client and server have never met.',
        'Then think about the performance trade-off of asymmetric math across gigabytes of responses.',
        'Pure symmetric can’t safely share the secret key over a public wire; pure asymmetric is far too slow for bulk traffic. TLS uses asymmetric crypto during the handshake to agree on a fast symmetric session key.',
      ],
      explanation:
        '**Symmetric encryption** is fast, but two strangers can’t safely send a raw shared key over an untrusted network without eavesdroppers capturing it. **Asymmetric encryption** solves key sharing and identity proof using public/private keys, *but* is computationally expensive for bulk data. TLS combines both: asymmetric during the handshake, fast symmetric for all application data afterward.',
      evaluationCriteria: [
        'Explains key-distribution problem of symmetric-only over untrusted networks',
        'Explains speed advantage of symmetric for bulk data after asymmetric handshake',
      ],
      topicIds: ['2.2.2', '2.2.3'],
    },
    {
      id: '2.2-kc-3',
      focusArea: 'Certificates & CAs',
      prompt:
        'During a TLS handshake, why isn’t simply receiving a server’s **public key** enough? What role does a **Certificate Authority (CA)** play, and what **three checks** must the client perform when verifying a certificate?',
      hints: [
        'Could an attacker send you their own self-made public key while claiming to be `api.bank.com`?',
        'Check: who signed it, who is it issued to, and when was it valid?',
        'Any attacker can make a key pair; a trusted CA signs the certificate binding the domain to the public key. Clients verify (1) trusted CA signature chain, (2) hostname match, and (3) valid non-expired dates.',
      ],
      explanation:
        'Anyone can generate a public/private key pair and claim a domain name. A **Certificate Authority** (already trusted in the client’s OS/browser) signs a **certificate** binding that domain name to its real public key. Clients verify: (1) the signature chains to a **trusted CA**, (2) the **hostname matches** the URL domain, and (3) the certificate is **within its validity dates (not expired)**.',
      evaluationCriteria: [
        'Explains why raw public keys don’t prove identity without a CA',
        'Lists CA signature trust chain, domain/hostname match, and expiration check',
      ],
      topicIds: ['2.2.4', '2.2.6'],
    },
    {
      id: '2.2-kc-4',
      focusArea: 'Private Key Proof',
      prompt:
        'Certificates are public—everyone connecting to `example.com` receives `example.com`’s certificate. Why can’t an attacker simply download `example.com`’s real certificate, send it to your browser, and pretend to be `example.com`?',
      hints: [
        'Compare what is inside the public certificate vs what never leaves the real server.',
        'What extra step happens in the TLS handshake beyond just handing over the certificate file?',
        'The attacker has the public certificate, not the matching **private key**; during the TLS handshake the server must sign fresh handshake data with its private key to prove possession.',
      ],
      explanation:
        'Because certificates are public, forwarding someone else’s certificate doesn’t prove ownership. During the TLS handshake, the server must also sign handshake data using its **private key**—which only the real server possesses—proving to the client that it controls the key paired with that certificate.',
      evaluationCriteria: [
        'Distinguishes public certificate from secret private key',
        'Explains server signing handshake step to prove private key ownership',
      ],
      topicIds: ['2.2.3', '2.2.5'],
    },
    {
      id: '2.2-kc-5',
      focusArea: 'HTTPS Connection Establishment',
      prompt:
        'Put the three protocols—**HTTP**, **TCP**, and **TLS**—in the exact order they activate when establishing an `https://` request, and note the latency trade-off before the first HTTP request actually sends.',
      hints: [
        'You need a reliable byte stream first, then security negotiation, then the application request.',
        'How many network round-trips happen before HTTP headers can fly?',
        'TCP 3-way handshake runs first, then the TLS handshake verifies identity and derives symmetric session keys, and then HTTP flows inside TLS—adding handshake round-trips before the first HTTP payload.',
      ],
      explanation:
        'First, **TCP** establishes a reliable byte stream (`SYN` → `SYN-ACK` → `ACK`). Second, the **TLS** handshake negotiates ciphers, verifies the server’s certificate and private key proof, and derives a shared symmetric session key. Third, **HTTP** requests and responses travel encrypted inside that TLS tunnel. Because TCP + TLS take multiple round-trips up front, keeping persistent connections alive avoids repeating that cost per request.',
      evaluationCriteria: [
        'Orders TCP -> TLS -> HTTP accurately',
        'Notes initial round-trip handshake latency before first HTTP message',
      ],
      topicIds: ['2.2.5', '2.2.7'],
    },
  ],
};
