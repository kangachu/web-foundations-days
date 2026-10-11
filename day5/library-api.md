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
```
- **Success Status:** `201 Created`

### 4. Update a Book
- **Method:** `PUT`
- **Path:** `/books/:id`
- **Description:** Replaces or updates the information of an existing book by ID.
- **Request Body:**
```json
{
  "title": "Things Fall Apart (Revised Edition)",
  "author": "Chinua Achebe",
  "isbn": "9780385474542",
  "publishedYear": 1958
}
```
- **Success Status:** `200 OK`

### 5. Delete a Book
- **Method:** `DELETE`
- **Path:** `/books/:id`
- **Description:** Permanently removes a book from the library catalog.
- **Request Body:** None
- **Success Status:** `204 No Content`

### 6. List Books by Author
- **Method:** `GET`
- **Path:** `/books?author={authorName}`
- **Description:** Filters and retrieves books written by a specific author using a query parameter.
- **Request Body:** None
- **Success Status:** `200 OK`

---

## Error Handling

- **400 Bad Request:** Occurs when the client sends malformed JSON or omits mandatory fields during book creation or update (for example: sending a `POST /books` without a `title` property).
- **404 Not Found:** Occurs when a requested book ID does not exist in the library catalog (for example: calling `GET /books/999` or `DELETE /books/999` when ID `999` is not registered in the system).
