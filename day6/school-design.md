# School Database Design

## Table Explanations

1. **`students`**: Stores core profile records for individual students, including `student_id` (primary key), `name`, and a unique `email` address.
2. **`courses`**: Manages academic course offerings with `course_id` (primary key) and `course_name`.
3. **`enrolments`**: Acts as a bridge linking students to the courses they take. It contains foreign keys referencing `student_id` and `course_id`, along with the `grade` earned.

## Relationships and the Join Table

- **One-to-Many Relationships**: A student can have many enrolments, but each enrolment record belongs to exactly one student. Similarly, a course can have many enrolments, but each enrolment corresponds to a single course.
- **Many-to-Many Relationship**: Students and courses have a many-to-many relationship because one student can register for multiple courses, and one course accommodates many enrolled students.
- **Why a Join Table is Needed**: Relational databases cannot directly associate rows in a many-to-many structure without duplicating data or creating unbounded arrays inside columns. The `enrolments` join table decomposes the many-to-many relationship into two clean one-to-many relationships while providing a designated place to store relationship-specific attributes such as `grade`. A composite `UNIQUE (student_id, course_id)` constraint ensures duplicate registrations are prevented.

## Proposed Index

- **Index**: `CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);`
- **Reason**: The `enrolments` table will frequently be queried in join operations looking up course listings and transcripts for specific students (e.g., `WHERE s.name = ...`). Adding an index on the foreign key column `student_id` prevents sequential full-table scans and keeps join lookups fast as the student body expands.

## SQL vs. NoSQL Architectural Choice

For this school management system, **SQL** is the ideal choice. Academic record-keeping requires strong consistency, data integrity, and strict relational constraints. Foreign key enforcement guarantees that orphaned course registrations cannot exist, and unique constraints ensure that students are never double-billed or double-enrolled in the same course. Relational queries using `JOIN`, `GROUP BY`, and `LEFT JOIN` provide straightforward ways to aggregate statistics and generate student transcripts without having to manually synchronize nested documents across separate document collections as in NoSQL.