# TicketHub System Architecture Design

A high-concurrency event ticketing platform engineered to handle flash sales with zero double-booking.

---

## 1. Requirements

### Functional Requirements
- **Browse & Search:** Users can browse upcoming events and view venue seat maps with real-time seat availability.
- **Seat Reservation (Hold):** Users can temporarily reserve seats for up to 10 minutes while checking out.
- **Payment & Order Fulfillment:** Users can complete payment for reserved seats, generating confirmed orders and digital tickets.
- **Ticket Management:** Users can view their purchased tickets and order histories.

### Non-Functional Requirements
- **Correctness & Zero Double-Booking:** Under no circumstances should two users be allowed to purchase or hold the identical seat.
- **Fairness:** Flash sales operate on a strict first-come, first-served basis using an organized virtual waiting queue.
- **High Availability & Fault Tolerance:** Read latency for browsing events remains under 100ms; critical checkout pathways remain available during flash sale spikes.
- **Scalability:** The system seamlessly scales to absorb traffic surges 100x larger than normal operations without database exhaustion.

---

## 2. Capacity & Traffic Estimations

### Baseline Assumptions
- **Registered Users:** 2,000,000 users
- **Normal Day Visitors:** 50,000 active visitors/day
- **Normal Page Views:** 10 views/visitor = 500,000 views/day
- **Normal Tickets Sold:** 5,000 tickets/day
- **Flash Sale Event:** 200,000 concurrent users competing for 20,000 available seats within a 10-minute window (600 seconds).

### Normal Day Calculations
- **Normal Read Throughput:** 500,000 views / 86,400 seconds ≈ **5.79 reads/sec**
- **Normal Write Throughput:** 5,000 ticket transactions / 86,400 seconds ≈ **0.06 writes/sec**

### "Big Sale" Peak Calculations (10-Minute Spike)
- **Peak User Influx:** 200,000 users arriving within 600 seconds.
- **Peak Seat View Requests:** Assuming each user refreshes the seat map 5 times in 10 minutes:
  - Total Reads = 1,000,000 read requests in 600s
  - Peak Read Rate = 1,000,000 / 600 ≈ **1,666.7 reads/sec (~288x normal baseline)**
- **Peak Hold/Buy Checkout Requests:** 200,000 attempts to acquire 20,000 seats:
  - Peak Write Rate = 200,000 / 600 ≈ **333.3 writes/sec (~5,500x normal baseline)**

### Traffic Comparison Analysis
During a big sale, read throughput spikes by nearly 300x, while write and reservation attempts spike by over 5,500x compared to daily averages. Directing this sudden write contention into relational databases would cause connection pool starvation, severe row lock contention, and cascading service outages. Therefore, the architecture must buffer and throttle inbound spikes using queuing, distributed in-memory holds, and aggressive edge caching.

---

## 3. REST API Specification

### 1. List Events
- **Method:** `GET`
- **Path:** `/api/events`
- **Description:** Returns paginated list of upcoming concerts and events.
- **Request Body:** None
- **Success Status:** `200 OK`
- **Response Example:**
```json
[
  {
    "id": 501,
    "title": "Afrobeats Live Stadium Tour",
    "venue": "Nairobi National Stadium",
    "eventDate": "2026-12-15T19:00:00Z"
  }
]
2. View Available Seats
Method: GET

Path: /api/events/:eventId/seats

Description: Retrieves the seat status map for a specified event.

Request Body: None

Success Status: 200 OK

Response Example:
[
  {
    "seatId": 1204,
    "section": "VIP-A",
    "seatNumber": "A-12",
    "price": 100.00,
    "status": "available"
  }
]
3. Hold Seat (Temporary Reservation)
Method: POST

Path: /api/seats/hold

Description: Places a 10-minute temporary lease on a specific seat for checkout.

Request Body:
{
  "eventId": 501,
  "seatId": 1204
}
Success Status: 201 Created

Response Example:
{
  "reservationId": "res_849302",
  "seatId": 1204,
  "expiresAt": "2026-10-31T23:05:00Z",
  "status": "held"
}
4. Process Payment & Complete Order
Method: POST

Path: /api/orders/checkout

Description: Validates payment, settles order, and finalizes permanent seat booking.

Request Body:

JSON
{
  "reservationId": "res_849302",
  "paymentMethod": "mpesa",
  "paymentToken": "tok_xyz987"
}
Success Status: 200 OK

Response Example:
{
  "orderId": 8092,
  "seatId": 1204,
  "status": "confirmed",
  "ticketId": "tkt_550e8400"
}
5. View User Tickets
Method: GET

Path: /api/users/me/tickets

Description: Retrieves all confirmed digital tickets for the authenticated user.

Request Body: None

Success Status: 200 OK

Response Example:
[
  {
    "ticketId": "tkt_550e8400",
    "eventId": 501,
    "eventName": "Afrobeats Live Stadium Tour",
    "seat": "VIP-A / A-12",
    "qrCode": "[https://cdn.tickethub.com/qr/tkt_550e8400.png](https://cdn.tickethub.com/qr/tkt_550e8400.png)"
  }
]
4. Relational Data Model
Table Schemas (DDL)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    venue TEXT NOT NULL,
    event_date TIMESTAMP NOT NULL,
    total_seats INTEGER NOT NULL
);

CREATE TABLE seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    section TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('available', 'held', 'sold')),
    held_by_user_id INTEGER,
    hold_expires_at TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (held_by_user_id) REFERENCES users(id),
    UNIQUE (event_id, section, seat_number)
);
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    seat_id INTEGER NOT NULL UNIQUE,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status TEXT NOT NULL CHECK(payment_status IN ('pending', 'completed', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (seat_id) REFERENCES seats(id)
);
Relationships
Events to Seats (One-to-Many): One event contains many individual seat records. Each seat belongs strictly to one event.

Users to Seats (One-to-Many): A user can hold multiple seats across active sessions, but an individual seat can only be leased to one user at any given time.

Users to Orders (One-to-Many): A user can make multiple ticket purchase orders over time.

Seats to Orders (One-to-One): A single confirmed seat maps to exactly one completed order row, enforced via the UNIQUE (seat_id) constraint on the orders table.
5. Preventing Double-Booking: Transactions & Constraints
Preventing two buyers from purchasing the same seat relies on a two-phase reservation approach combining in-memory distributed locks with strict database-level ACID transactions:

Atomic In-Memory Seat Holds (Redis + Redlock):

When a user selects a seat to hold, the application executes an atomic command in Redis:
SET seat:{seat_id}:lock {user_id} NX EX 600
Because NX only succeeds if the key does not already exist, concurrent attempts on the same seat fail immediately at the cache layer with zero database overhead. The 600-second TTL (10 minutes) automatically releases the seat if checkout is abandoned.

ACID Transactions with Pessimistic Row Locking (SELECT ... FOR UPDATE):

When the user transitions from holding to payment checkout, the database executes a pessimistic lock within a transaction:
BEGIN TRANSACTION;

SELECT id, status, held_by_user_id, hold_expires_at 
FROM seats 
WHERE id = 1204 
FOR UPDATE;

-- Verify the seat is either free or held by this user within the valid lease window
UPDATE seats 
SET status = 'sold', held_by_user_id = 42, hold_expires_at = NULL 
WHERE id = 1204 AND (status = 'available' OR (status = 'held' AND held_by_user_id = 42));

INSERT INTO orders (user_id, seat_id, total_amount, payment_status)
VALUES (42, 1204, 100.00, 'completed');

COMMIT;
The FOR UPDATE clause places an exclusive lock on that seat row, preventing any other transaction from reading or mutating it until the current transaction commits or rolls back.

Database Constraints as the Final Safety Net:

The orders table includes a UNIQUE (seat_id) constraint.

The seats table enforces UNIQUE (event_id, section, seat_number).

Even if race conditions bypass application-layer checks, the database engine enforces physical uniqueness and rejects conflicting duplicate writes with an integrity error.

6. Architecture & Flash Sale Survival
Architecture Diagram
[ 200,000 Flash Sale Clients ]
                                |
                                v
                             [ DNS ]
                                |
                                v
                   [ CDN (Cloudflare Edge) ]
               (Caches Static Venue Maps & Assets)
                                |
                                v
                      [ Virtual Waiting Room ]
                  (Traffic Gatekeeper: Throttles Influx)
                                |
                                v
                     [ Layer 7 Load Balancer ]
                                |
         +----------------------+----------------------+
         v                                             v
  [ App Server 1 ]                              [ App Server 2 ]
         |                                             |
         +----------------------+----------------------+
                                |
         +----------------------+----------------------+
         v                                             v
  [ Redis Cluster ]                             [ Message Queue ]
  (Distributed Locks,                           (RabbitMQ / Kafka)
   Seat Holds, Sessions)                               |
                                                       v
                                            [ Order Worker Fleet ]
                                                       |
                                                       v
                                            [ Primary Database (SQL) ]
                                            (Pessimistic Row Locks & Writes)
                                                       |
                                                       | (Async Replication)
                                                       v
                                            [ Read Replica Pool ]
                                            (Event Queries & Ticket Views)

                                            Component Explanations
DNS: Translates human-readable domain names into anycast IP addresses with DDoS protection.

CDN (Edge Cache): Serves cached event details, performer banners, and static SVG venue layouts directly from regional edge points, eliminating backend calls for static data.

Virtual Waiting Room: Acts as a rate-limiting valve during flash sales, funneling 200,000 concurrent users into an orderly queue and admitting only 2,000 users per minute into active checkout.

Load Balancer: Distributes admitted user traffic evenly across stateless application server nodes.

App Servers: Runs business logic, validates request payloads, enforces authentication, and coordinates seat reservation workflows.

Redis Cluster: Manages seat hold states, TTL expiration timers (10-minute releases), and distributed mutexes at sub-millisecond memory speed.

Message Queue: Buffers payment confirmations and ticketing generation payloads to insulate transactional databases from sudden write storms.

Order Workers: Consumes background jobs from the queue to generate PDF/QR-code tickets and send email confirmations asynchronously.

Primary Database (SQL): Enforces ACID transaction integrity, row-level locks (FOR UPDATE), and permanent ownership states for purchased seats.

Read Replica Pool: Offloads read-only traffic from the primary database, serving event queries and ticket lookups.

7. Architectural Trade-offs
Eventual Consistency vs. Real-Time Seat Map Display:

Trade-off: Seat map read views are served via read replicas and Redis cache buffers with a 1-to-2-second TTL.

Consequence: A seat that was claimed a fraction of a second ago might still appear available on an incoming user's screen. Attempting real-time strong consistency across 200,000 simultaneous browsing sessions would overwhelm the primary database with contention. Any collision is caught and handled safely the moment the user attempts an atomic hold.

Virtual Waiting Room Queue vs. Immediate Checkout Access:

Trade-off: Admitting users via a virtual tokenized queue creates intentional latency and waiting screens for users.

Consequence: Users cannot immediately jump into checkout, but this design guarantees fairness, stops automated bots from overwhelming checkout endpoints, and ensures that admitted users experience an error-free transaction without connection timeouts.
