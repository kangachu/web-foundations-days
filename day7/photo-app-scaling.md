# SnapShare Scaling Architecture Plan

## 1. Assumptions & Baseline Numbers
- **Total Registered Users:** 10,000,000 users
- **Daily Active Users (DAU):** 10% of 10,000,000 = 1,000,000 active users/day
- **Daily Uploads:** 1 photo per active user = 1,000,000 uploads/day
- **Daily Feed Views:** 50 feed views per active user = 50,000,000 views/day
- **Storage Sizes:** Original photo = 2 MB; Thumbnail = 50 KB (0.05 MB); Total per upload = 2.05 MB
- **Seconds in a Day:** 86,400 seconds

---

## 2. Capacity Estimations

### Uploads Per Second (Write Throughput)
- **Average Uploads/sec:** 1,000,000 / 86,400 ≈ **11.57 uploads/sec** (approx. 12 writes/sec)
- **Peak Uploads/sec (5x peak):** 11.57 × 5 ≈ **57.85 uploads/sec** (approx. 58 writes/sec)

### Feed Views Per Second (Read Throughput)
- **Average Feed Views/sec:** 50,000,000 / 86,400 ≈ **578.70 views/sec** (approx. 579 reads/sec)
- **Peak Feed Views/sec (5x peak):** 578.70 × 5 ≈ **2,893.50 views/sec** (approx. 2,894 reads/sec)

### Annual Storage Requirements
- **Daily Storage Ingestion:** 1,000,000 uploads × 2.05 MB = 2,050,000 MB ≈ 2.05 TB/day
- **Annual Storage (365 days):** 2.05 TB/day × 365 days ≈ **748.25 TB/year** (excluding metadata and replication overhead)

---

## 3. Read-Heavy vs. Write-Heavy System
SnapShare is overwhelmingly **read-heavy**, operating at a read-to-write ratio of **50:1** (50 million feed reads vs. 1 million uploads daily). 

Because reads vastly outnumber writes, system design efforts must prioritize read latency reduction through multi-layer caching, read-replica database pools, pre-computed feeds, and globally distributed CDN caching for media files.

---

## 4. Why Photos Do Not Belong in the Database
Storing raw image binaries (BLOBs) inside a relational database causes table sizes to balloon rapidly, degrades index performance, slows database backups, and consumes expensive database CPU and memory for basic I/O streaming. 

Instead, binary image files are stored in cost-effective, durable **Object Storage** (such as AWS S3 or Google Cloud Storage), while the database stores only small string references (e.g., photo URL, owner ID, timestamp, and metadata).

---

## 5. Text-Based Architecture Diagram

```text
               [ Clients: Web & Mobile Apps ]
                             |
         +-------------------+-------------------+
         | (Static / Cached Media Reads)         | (API Requests: Uploads & Feeds)
         v                                       v
      [ CDN ]                            [ Load Balancer ]
         |                                       |
         | (Origin Fetch)        +---------------+---------------+
         |                       v                               v
         |               [ App Server 1 ]                [ App Server 2 ]
         |                       |                               |
         |         +-------------+-------------+                 |
         |         |                           |                 |
         v         v                           v                 v
   [ Object Storage (S3) ]            [ Cache (Redis) ]   [ Message Queue ]
           ^                                                     |
           |                                                     v
   (Async Thumbnail) <---------------------------------- [ Worker Service ]
                                                                 |
                                                                 |
                               +---------------------------------+
                               |
                               v
                     [ Primary Database (SQL) ]  (Writes)
                               |
                               | (Replication)
                               v
                    [ Read Replica DB ]         (Reads)```
```
---


## 6. Component Explanations (One Sentence Each)
CDN (Content Delivery Network): Caches popular photos and thumbnails physically close to users around the globe to deliver ultra-low read latency and minimize server bandwidth costs.

Load Balancer: Distributes inbound user traffic uniformly across redundant application servers to prevent any single instance from becoming a bottleneck.

App Servers: Executes core application logic, handles authentication, coordinates feed generation, and processes upload payloads.

Cache (Redis / Memcached): Stores frequently retrieved database queries, user profile records, and trending feed indices in memory for sub-millisecond retrieval.

Primary Database (SQL): Enforces relational data integrity, manages relational tables (users, follows, photo metadata), and handles all write and mutation queries.

Read Replica DB: Offloads read-only feed queries and user lookups from the primary database using asynchronous replication.

Object Storage (S3): Provides horizontally scalable, highly available, and cost-efficient storage for raw photos and generated thumbnail files.

Message Queue (RabbitMQ / Kafka): Decouples time-consuming background processing from user-facing request cycles by storing thumbnail generation jobs in an asynchronous queue.

Worker: Consumes jobs from the message queue in the background to resize uploaded images into 50 KB thumbnails without blocking the user's upload response.

7. Step-by-Step Upload Flow
Client Request: The user selects a photo on their device and submits a POST /photos upload request with the photo binary and metadata.

Load Balancer Routing: The Load Balancer forwards the request to an available application server instance.

Object Storage Save: The application server streams the full-size image (2 MB) directly to Object Storage and receives a storage object URI.

Metadata Persistence: The application server writes a record to the Primary Database containing the image URI, user ID, upload timestamp, and marks the thumbnail status as processing.

Queue Job Dispatch: The application server pushes a message { photoId, imageUri } onto the Message Queue and immediately responds to the user with 201 Created so they are not blocked waiting for image processing.

Async Thumbnail Processing: A background Worker picks up the job from the queue, downloads the original image from Object Storage, generates the 50 KB thumbnail version, and saves the thumbnail back to Object Storage.

Record Update & Cache Invalidation: The worker updates the database record with the new thumbnail URI and updates/invalidates the user's cached timeline so followers immediately see the thumbnail when browsing their feed.

8. Architectural Trade-offs
Eventual Consistency vs. Strong Consistency (Read Replicas): Using read replicas offloads read pressure from the primary database, but asynchronous replication lag means a follower might not see a newly uploaded photo for a brief second if their feed query hits a replica that hasn't caught up yet.

Asynchronous Background Processing vs. Immediate Asset Availability (Queues): Offloading thumbnail resizing to a message queue gives the user an instantaneous upload response, but introduces the slight drawback that the thumbnail is not immediately visible for the first few hundred milliseconds until the worker finishes processing.            
