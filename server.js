const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const flash = require("express-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const MongoDBStore = require("connect-mongodb-session")(session);
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const mongourl =
  "mongodb+srv://s1313645_db_user:12345@cluster0.ju6nn4y.mongodb.net/381GP?retryWrites=true&w=majority";

const dbname = "381GP";

app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(flash());

const store = new MongoDBStore({
  uri: mongourl,
  databaseName: dbname,
  collection: "sessions",
});

app.use(
  session({
    secret: "super_secret_key",
    store: store,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const client = await MongoClient.connect(mongourl);
        const db = client.db(dbname);

        const user = await db.collection("users").findOne({ email });

        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const client = await MongoClient.connect(mongourl);
    const db = client.db(dbname);
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

async function dbConnect() {
  const client = await MongoClient.connect(mongourl);
  return client.db(dbname); 
}

function isAdminUser(user) {
  return user && user.email === "123@test.com";
}

function ensureAdmin(req, res, next) {
  if (!req.isAuthenticated() || !isAdminUser(req.user)) {
    return res.status(403).send("Forbidden");
  }
  next();
}

async function borrowBook(bookId, borrowerEmail) {
  const db = await dbConnect();

  const book = await db
    .collection("books")
    .findOne({ _id: new ObjectId(bookId) });

  if (!book) throw new Error("Book not found");

  await db.collection("books").updateOne(
    { _id: new ObjectId(bookId) },
    {
      $set: {
        available: false,
        borrowedBy: borrowerEmail,
      },
    }
  );

  // 更新 borrower
  await db.collection("borrowers").updateOne(
    { email: borrowerEmail },
    {
      $push: {
        borrowedBooks: {
          bookId,
          bookTitle: book.title,
          borrowDate: new Date(),
        },
      },
    },
    { upsert: true }
  );
}

async function returnBook(bookId) {
  const db = await dbConnect();

  const book = await db
    .collection("books")
    .findOne({ _id: new ObjectId(bookId) });

  if (!book) return;

  const borrowerEmail = book.borrowedBy;

  await db.collection("books").updateOne(
    { _id: new ObjectId(bookId) },
    {
      $set: { available: true },
      $unset: { borrowedBy: "" },
    }
  );

  if (borrowerEmail) {
    await db.collection("borrowers").updateOne(
      { email: borrowerEmail },
      {
        $pull: {
          borrowedBooks: { bookId: bookId },
        },
      }
    );
  }
}


app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => {
  res.render("login", { messages: req.flash() });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.get("/signup", (req, res) => {
  res.render("signup", { messages: req.flash() });
});

app.post("/signup", async (req, res) => {
  const db = await dbConnect();
  const { username, email, password } = req.body;

  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    req.flash("error", "Email already exists");
    return res.redirect("/signup");
  }

  const hashed = await bcrypt.hash(password, 10);

  await db.collection("users").insertOne({
    username,
    email,
    password: hashed,
  });

  res.redirect("/login");
});

app.get("/home", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const db = await dbConnect();
  const books = await db.collection("books").find({}).toArray();
  const borrowers = await db.collection("borrowers").find({}).toArray();
  const isAdmin = isAdminUser(req.user);

  res.render("home", {
    user: req.user,
    isAdmin,
    books,
    borrowers,
    messages: req.flash(),
  });
});

app.post("/books/add", ensureAdmin, async (req, res) => {
  try {
    const { title, isbn } = req.body;
    if (!title || !isbn) {
      req.flash("error", "Title and ISBN are required");
      return res.redirect("/home");
    }

    const db = await dbConnect();
    await db.collection("books").insertOne({
      title,
      isbn,
      available: true,
    });

    res.redirect("/home");
  } catch (err) {
    console.error("POST /books/add error:", err);
    res.status(500).send("Server error");
  }
});

app.get("/books/edit/:id", ensureAdmin, async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const db = await dbConnect();
  const book = await db
    .collection("books")
    .findOne({ _id: new ObjectId(req.params.id) });

  if (!book) return res.status(404).send("Book not found");

  res.render("edit_book", {
    book,
    messages: req.flash(),
  });
});

app.post("/books/edit/:id", ensureAdmin, async (req, res) => {
  const bookId = req.params.id;
  const { status, borrowerEmail } = req.body;

  try {
    if (status === "available") {
      await returnBook(bookId);
    } else if (status === "borrowed") {
      if (!borrowerEmail) {
        req.flash("error", "Borrower email is required when status is Borrowed");
        return res.redirect("/books/edit/" + bookId);
      }

      await returnBook(bookId);
      await borrowBook(bookId, borrowerEmail.trim());
    }

    res.redirect("/home");
  } catch (err) {
    console.error("Edit book ERROR:", err);
    res.status(500).send("Server error");
  }
});

app.post("/books/delete", ensureAdmin, async (req, res) => {
  const { bookId } = req.body;

  try {
    await returnBook(bookId);
    res.redirect("/home");
  } catch (err) {
    console.error("Delete/Return book ERROR:", err);
    res.status(500).send("Server error");
  }
});

app.post("/borrow/book", async (req, res) => {
  const { bookId, borrowerEmail } = req.body;

  try {
    await borrowBook(bookId, borrowerEmail);
    res.redirect("/home");
  } catch (err) {
    console.error("Borrow from /borrow/book ERROR:", err);
    res.status(500).send("Server error");
  }
});

app.post("/borrow/fromBorrowers", ensureAdmin, async (req, res) => {
  const { bookId, borrowerEmail } = req.body;

  if (!bookId || !borrowerEmail) {
    return res.status(400).send("Missing bookId or borrowerEmail");
  }

  try {
    await borrowBook(bookId, borrowerEmail);
    res.redirect("/home");
  } catch (err) {
    console.error("Borrow ERROR:", err);
    res.status(500).send("Server error");
  }
});

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

app.get("/users", async (req, res) => {
  try {
    const db = await dbConnect();
    const users = await db
      .collection("users")
      .find({})
      .project({ password: 0 })
      .toArray();

  res.json(users);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/users", async (req, res) => {
  try {
    const db = await dbConnect();
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "username, email, password are required" });
    }

    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await db.collection("users").insertOne({
      username,
      email,
      password: hashed,
    });

    res.status(201).json({
      message: "User created",
      userId: result.insertedId,
      username,
      email,
    });
  } catch (err) {
    console.error("POST /users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/users/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const db = await dbConnect();

    const { username, email, password } = req.body;
    const update = {};

    if (username) update.username = username;
    if (email) update.email = email;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      update.password = hashed;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });

    res.json({
      message: "User updated",
      user: updatedUser,
    });
  } catch (err) {
    console.error("PUT /users/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const db = await dbConnect();
    const result = await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
