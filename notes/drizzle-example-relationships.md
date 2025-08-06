# Modeling Entity Relationships With Drizzle

https://orm.drizzle.team/docs/relations

## Scenario 1: One-To-One Relationship

_Use Case_: Each employee has exactly one desk, and each desk is assigned to only one employee.

**Table Definitions**

```ts
// Employees table: Each employee can have one desk
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // No deskId here—relation is handled from the desk's side
  // Technically, the db schema permits a one-to-zero relationship, e.g. a parent without a child, an employee without a desk.
  // A true one-to-one relationship must be enforced both at the database level _and_ the application level.
})

// Desks table: Each desk must be assigned to exactly one employee
export const desks = pgTable("desks", {
  id: serial("id").primaryKey(),
  location: text("location").notNull(),
  employeeId: integer("employee_id")
    .notNull()
    .unique() // Enforces one-to-one at the DB level: Each desk belongs to exactly one employee, and no employee can have two desks
    .references(() => employees.id, { onDelete: "cascade" }),
})
```

**Relations**

```ts
// Employee relations: Each employee has one desk (or possibly none)
export const employeesRelations = relations(employees, ({ one }) => ({
  desk: one(desks, {
    // No fields/references needed, since relation is from the desk side
    // Drizzle will infer it via the foreign key on desks.employeeId
  }),
}))

// Desk relations: Each desk is assigned to one employee (required)
export const desksRelations = relations(desks, ({ one }) => ({
  employee: one(employees, {
    fields: [desks.employeeId],
    references: [employees.id],
  }),
}))
```

**Example Queries**

```ts
// Get an employee with their desk
const employeeWithDesk = await db.query.employees.findFirst({
  where: (employees, { eq }) => eq(employees.id, 1),
  with: { desk: true },
})

// Get a desk with its assigned employee
const deskWithEmployee = await db.query.desks.findFirst({
  where: (desks, { eq }) => eq(desks.id, 10),
  with: { employee: true },
})
```

## Scenario 2: One-To-One Relationship (Reflexive / Self-Referential)

_Use Case_: Each person may have at most one spouse (and each spouse is another person in the same table).

**Table Definition**

```ts
// People table: Each person may have a spouse, who is also a person in this table
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  spouseId: integer("spouse_id")
    // Ensures no two people have the same spouseId (one-to-one)
    // Unless you're trying to model for polygamy ;)
    .unique()
    // If spouse is deleted, set spouseId to null. Column nullability allows for
    // people who have never been married. Also allows for divorces and widows.
    .references(() => people.id, { onDelete: "set null" }),
})
```

**Relations**

```ts
// Self-referential relation: a person's spouse is another person
export const peopleRelations = relations(people, ({ one }) => ({
  spouse: one(people, {
    fields: [people.spouseId],
    references: [people.id],
    // Optionally use relationName if you want to distinguish directions, but for a symmetric spouse relation, not
    // necessary. This should be experimentally verified though by actually setting up this example in Drizzle.
  }),
}))
```

**Example Query**

```ts
// Get a person with their spouse
const personWithSpouse = await db.query.people.findFirst({
  where: (people, { eq }) => eq(people.id, 2),
  with: { spouse: true },
})
```

## Scenario 3: One-To-Many Relationship

_Use Case_: A department has many employees; each employee belongs to one department.

**Table Definitions**

```ts
// Departments table: Each department can have many employees
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
})

// Employees table: Each employee belongs to exactly one department
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departmentId: integer("department_id")
    .notNull() // Employee must belong to a department
    .references(() => departments.id, { onDelete: "restrict" }),
  // Restrict: prevents deleting a department that still has employees
  // Other options, such as cascade, could be relevant as well depending
  // on how you want to model the domain.
})
```

**Relations**

```ts
// Department perspective: has many employees
export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
}))

// Employee perspective: belongs to one department
// Note that fields and references are typically required from the child perspective.
export const employeesRelations = relations(employees, ({ one }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
}))
```

**Example Query**

```ts
// Get all departments with all of their employees
const allDepartments = await db.query.departments.findMany({
  with: { employees: true },
})
```

## Scenario 4: One-To-Many Relationship (Reflexive / Self-Referential)

_Use Case_: Each person may have a mother and/or a father who are also users in the system.

**Table Definition**

```ts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fatherId: integer("father_id").references(() => users.id, {
    onDelete: "set null",
  }),
  motherId: integer("mother_id").references(() => users.id, {
    onDelete: "set null",
  }),
  // No unique constraints in this example. That would restrict fathers/mothers from having
  // more than one child, which is not correct for family trees.
})
```

**Relations**

_Note_: `relationName` is only needed when there are multiple foreign keys in a child table all pointing to the same parent table. This applies in both reflexive and non-reflexive scenarios.

```ts
export const usersRelations = relations(users, ({ one, many }) => ({
  // Child perspective: Who is my father/mother?
  father: one(users, {
    fields: [users.fatherId],
    references: [users.id],
    relationName: "father",
  }),
  mother: one(users, {
    fields: [users.motherId],
    references: [users.id],
    relationName: "mother",
  }),

  // Parent perspective: Who are my children?
  childrenAsFather: many(users, {
    relationName: "father", // All users whose fatherId is this user's id
  }),
  childrenAsMother: many(users, {
    relationName: "mother", // All users whose motherId is this user's id
  }),
}))
```

**Example Queries**

```ts
// Get a user with their parents (father and mother)
const userWithParents = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, 7),
  with: { father: true, mother: true },
})

// Get a user with their children. In our example, since we aren't tracking the
// gender of a user and hence don't know if they are likely to be a mother or
// a father, then we just do both and can merge both arrays in application
// code or possibly using Drizzle set operations.
// https://orm.drizzle.team/docs/set-operations
const userWithChildren = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, 3),
  with: { childrenAsFather: true, childrenAsMother: true },
})
```

## Scenario 5: Many-To-Many Relationship

_Use Case_: Students can enroll in many courses, and each course can have many students enrolled.

**Table Definitions**

```ts
// Students table: Each student can enroll in many courses
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
})

// Courses table: Each course can have many students
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  code: text("code").unique().notNull(),
})

// Junction table for the many-to-many relation. a.k.a Join table, a.k.a Bridge table.
// When this table is purely a junction table, rather than an associative entity, the
// naming convention is often coursesToStudents (tables in alphabetical order).
export const enrollments = pgTable(
  "enrollments",
  {
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    // Sometimes, a junction table might have it's own attributes that go beyond simply link two tables together,
    // thus becoming an entity unto itself. This is sometimes called an "associative entity".
    enrolledAt: text("enrolled_at").notNull(), // Date/time attribute
    status: text("status").notNull(), // Enrollment status
    grade: text("grade"), // Nullable, filled after course
  },
  (t) => [primaryKey({ columns: [t.studentId, t.courseId] })], // Composite PK to prevent duplicate enrollments
)
```

**Relations**

```ts
// Student perspective: enrollments links students to courses
export const studentsRelations = relations(students, ({ many }) => ({
  enrollments: many(enrollments),
}))

// Course perspective: enrollments links courses to students
export const coursesRelations = relations(courses, ({ many }) => ({
  enrollments: many(enrollments),
}))

// Enrollment perspective: connect to both student and course
export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}))
```

**Example Queries**

```ts
// Get a student with all their enrolled courses
const studentWithCourses = await db.query.students.findFirst({
  where: (students, { eq }) => eq(students.id, 12),
  with: {
    enrollments: {
      with: { course: true },
    },
  },
})

// Get a course with all enrolled students
const courseWithStudents = await db.query.courses.findFirst({
  where: (courses, { eq }) => eq(courses.id, 5),
  with: {
    enrollments: {
      with: { student: true },
    },
  },
})
```

## Scenario 6: Many-To-Many Relationship (Reflexive / Self-Referential)

_Use Case_: Users can “follow” other users (e.g., a social network). Each user can follow many users, and can be followed by many users.

**Table Definitions**

```ts
// Users table: all users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  name: text("name").notNull(),
})

// Join table: each row is one user following another user
export const userFollows = pgTable(
  "user_follows",
  {
    // This user...
    followerId: integer("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // ...is following this user
    followingId: integer("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] })], // Each (follower, following) pair is unique
)
```

**Relations**

```ts
// User relations: both sides of "follow"
export const usersRelations = relations(users, ({ many }) => ({
  // Users this user follows
  followingRelations: many(userFollows, { relationName: "follower" }),
  // Users who follow this user
  followerRelations: many(userFollows, { relationName: "following" }),
}))

// Follow join table: link to both user sides
export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, {
    fields: [userFollows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [userFollows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}))
```

**Example Query**

```ts
// Get a user with all their followers, and also everyone who the user follows
const userWithFollows = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, 42),
  with: {
    // Who this user follows
    followingRelations: {
      with: {
        following: true, // This gets the actual followed user
      },
    },
    // Who follows this user
    followerRelations: {
      with: {
        follower: true, // This gets the actual follower user
      },
    },
  },
})
```

## Additional Relationship Modeling Patterns

These are beyond the scope of this document, but there are many other relational modeling patterns that are possible. These are more advance and not as common as the patterns discussed above. It's also often the case that advanced patterns such as these cannot be fully enforced at the database layer or by the ORM and must be enforced at a higher level in the application code. This often isn't ideal, but it just depends on what you're trying to model and there are almost always tradeoffs or multiple ways of accomplishing something.

**Polymorphic (Generic) Relations**
A polymorphic relation allows a child record to be associated with one of several possible parent tables. For example, a `comments` table might allow each comment to belong to either a `post` or an `image`. This is useful when multiple entity types can share the same kind of relationship, but it cannot be fully enforced at the database level and usually relies on application logic.

**Composite Key Relationships**
Some tables use multiple columns together as a primary key, such as a line items table where each line is uniquely identified by both an `order_id` and an `item_id`. This pattern is commonly found in join tables or when the natural uniqueness of a record spans more than one field.

**Multi-Role Relationships**
A multi-role relationship occurs when a table references another table multiple times for different roles. For example, a `projects` table may reference a `users` table via both `lead_id` and `sponsor_id`. Each foreign key represents a different role or relationship between the same pair of tables.

**Soft-Delete / Archival Filtering**
Instead of physically deleting rows from a table, a "soft delete" pattern adds a flag (like `isArchived` or `deleted_at`) to mark records as inactive or archived. Queries then filter out these records, allowing for easy undeletion and maintaining historical data.

**Ternary (Three-Way) Relationships**
A ternary relationship models an association among three distinct entities. For example, a `prescriptions` table may link a `doctor`, a `patient`, and a `medication`. These relationships are typically modeled with a join table containing foreign keys to each of the participating tables.

**Many-to-Many with Attributes (Association Tables With Data)**
A join table in a many-to-many relationship may include additional attributes that describe the relationship itself. For example, an `enrollments` table links students to courses and also stores a `grade` field for each student's enrollment.

**Temporal Relationships / Effective Dating**
Some relationships are valid only during specific time periods. For example, tracking an employee’s department history over time requires an association table with `start_date` and `end_date` columns. This pattern is useful for historical queries and audit trails.

**Closure Table Pattern**
This advanced pattern is used for efficiently querying hierarchies with arbitrary depth, such as organizational charts or category trees. The closure table precomputes all ancestor–descendant relationships, allowing for fast traversals and subtree queries.

**Inheritance Mapping (Single Table Inheritance / Discriminator Columns)**
Single table inheritance models different entity subtypes in one table, using a `type` or discriminator column. Only some columns are used depending on the row’s type. This pattern is often used when most fields are shared but a few are subtype-specific.

**Tagging/Labeling Pattern**
A many-to-many pattern where a join table links items (such as posts) to tags or labels. Tags provide a flexible way to categorize or annotate records without rigidly structuring data.
