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
                     [ Read Replica DB ]         (Reads)