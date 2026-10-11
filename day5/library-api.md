# Library Books REST API Design

A RESTful API specification for managing a library's books resource.

## Endpoints

### 1. List All Books
- **Method:** `GET`
- **Path:** `/books`
- **Description:** Retrieves an array of all available books in the library catalog.
- **Request Body:** None
- **Success Status:** `200 OK`

### 2. Get One Book
- **Method:** `GET`
- **Path:** `/books/:id`
- **Description:** Retrieves the details of a single book identified by its ID.
- **Request Body:** None
- **Success Status:** `200 OK`

### 3. Create a Book
- **Method:** `POST`
- **Path:** `/books`
- **Description:** Adds a new book entry to the library collection.
- **Request Body:**
```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "isbn": "9780385474542",
  "publishedYear": 1958
}