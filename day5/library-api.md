# Library Books REST API Design

A RESTful API design for a library's books resource.

## Endpoints

### 1. List All Books
- **Method:** `GET`
- **Path:** `/books`
- **Description:** Returns a list of all books in the library.
- **Request Body:** None
- **Success Status:** `200 OK`

### 2. Get One Book
- **Method:** `GET`
- **Path:** `/books/:id`
- **Description:** Returns the details of a single book by its ID.
- **Request Body:** None
- **Success Status:** `200 OK`

### 3. Create a Book
- **Method:** `POST`
- **Path:** `/books`
- **Description:** Adds a new book to the library catalog.
- **Request Body:**
```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "isbn": "9780385474542",
  "publishedYear": 1958
}