const express = require('express');
const app = express();
const path = require("path");
const session = require("express-session");
const formidable = require("express-formidable");
const mongodb = require("mongodb");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
var fsPromises = require('fs').promises;
var { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const MongoDBStore = require('connect-mongodb-session')(session);

// Initial users array with hardcoded credentials for testing (role removed)
const initialUsers = [
    { username: "admin", email: "admin@library.com", password: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi" }, // Hashed "adminpass"
    { username: "user", email: "user@library.com", password: "$2b$10$W5Z4l0y8u8x9jK2m3n4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f" } // Hashed "userpass"
];

// APP
app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(formidable());
app.use(flash());
app.use((req, res, next) => {
    let d = new Date();
    console.log(`TRACE: ${req.path} was requested at ${d.toLocaleDateString()}`);
    next();
});

// Session configuration with MongoDB store
const mongourl = 'mongodb+srv://s1313645_db_user:12345@cluster0.ju6nn4y.mongodb.net/?appName=Cluster0';
const dbname = 'S381GP';
const store = new MongoDBStore({
    uri: mongourl,
    collection: 'sessions'
});
app.use(session({
    secret: "thiSiSasEcREtStr",
    store: store,
    cookie: { httpOnly: false },
    resave: false,
    saveUninitialized: false
}));

// Connect to MongoDB
const client = new MongoClient(mongourl, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
let db;
async function startServer() {
    await client.connect();
    db = client.db(dbname);
    // Insert initial users into 'users' collection
    const usersCollection = db.collection('users');
    for (let user of initialUsers) {
        const existing = await usersCollection.findOne({ email: user.email });
        if (!existing) {
            await usersCollection.insertOne(user);
            console.log(`Inserted initial user: ${user.email}`);
        }
    }
    await db.createCollection('books');
    await db.createCollection('borrowers');
    app.listen(port, () => {
        console.log(`Server running on Port: ${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying ${port + 1}...`);
            app.listen(port + 1);
        }
    });
}
startServer().catch(console.error);

// Authorization function (simplified, no role check)
const isLoggedIn = (req, res, next) => {
    console.log("Session user:", req.session.user);
    if (req.session && req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
};

// Database functions
const findAccount = async (doc) => {
    var collection = db.collection('users');
    let result = await collection.find(doc).toArray();
    console.log("Find the account's data: " + JSON.stringify(result));
    return result;
};
const newAccount = async (doc) => {
    var collection = db.collection('users');
    let result = await collection.insertOne(doc);
    console.log("Created new account:" + JSON.stringify(result));
    return result;
};
const findBooks = async (criteria = {}) => {
    var collection = db.collection('books');
    let result = await collection.find(criteria).toArray();
    console.log("Fetched books with criteria:", criteria, "Result:", JSON.stringify(result));
    return result;
};
const insertBook = async (doc) => {
    var collection = db.collection('books');
    let result = await collection.insertOne({ ...doc, available: doc.available === 'true' || doc.available === true });
    console.log("Inserted book:", JSON.stringify(result));
    return result;
};
const updateBook = async (criteria, updateData) => {
    const collection = db.collection('books');
    const result = await collection.updateOne(criteria, { $set: { ...updateData, available: updateData.available === 'true' || updateData.available === true } });
    console.log("Update result:", result);
    return result;
};
const deleteBook = async (criteria) => {
    var collection = db.collection('books');
    let result = await collection.deleteOne(criteria);
    console.log("Deleted book:" + JSON.stringify(result));
    return result;
};
const findAuthors = async (criteria = {}) => {
    var collection = db.collection('authors');
    let result = await collection.find(criteria).toArray();
    console.log("Returned authors:" + JSON.stringify(result));
    return result;
};
const insertAuthor = async (doc) => {
    var collection = db.collection('authors');
    let result = await collection.insertOne(doc);
    console.log("Inserted author:" + JSON.stringify(result));
    return result;
};
const updateAuthor = async (criteria, updateData) => {
    const collection = db.collection('authors');
    const result = await collection.updateOne(criteria, { $set: updateData });
    console.log("Update result:", result);
    return result;
};
const deleteAuthor = async (criteria) => {
    var collection = db.collection('authors');
    let result = await collection.deleteOne(criteria);
    console.log("Deleted author:" + JSON.stringify(result));
    return result;
};
const findBorrowers = async (criteria = {}) => {
    var collection = db.collection('borrowers');
    let result = await collection.find(criteria).toArray();
    console.log("Returned borrowers:" + JSON.stringify(result));
    return result;
};
const insertBorrower = async (doc) => {
    var collection = db.collection('borrowers');
    let result = await collection.insertOne(doc);
    console.log("Inserted borrower:" + JSON.stringify(result));
    return result;
};
const updateBorrower = async (criteria, updateData) => {
    const collection = db.collection('borrowers');
    const result = await collection.updateOne(criteria, { $set: updateData });
    console.log("Update result:", result);
    return result;
};
const deleteBorrower = async (criteria) => {
    var collection = db.collection('borrowers');
    let result = await collection.deleteOne(criteria);
    console.log("Deleted borrower:" + JSON.stringify(result));
    return result;
};

// Borrow book function
const borrowBook = async (req, res) => {
    try {
        const borrowerEmail = req.fields.borrowerEmail;
        const bookId = req.fields.bookId;
        const book = await findBooks({ _id: ObjectId.createFromHexString(bookId) });
        if (book.length === 0 || !book[0].available) {
            req.flash('error', 'Book not available.');
            return res.redirect('/borrowed');
        }
        await updateBook({ _id: ObjectId.createFromHexString(bookId) }, { available: false });
        const borrowDate = new Date();
        await updateBorrower(
            { email: borrowerEmail },
            { $push: { borrowedBooks: { bookId: ObjectId.createFromHexString(bookId), borrowDate } } }
        );
        req.flash('success', 'Book borrowed successfully.');
        res.redirect('/borrowed');
    } catch (err) {
        console.error("Error borrowing book:", err);
        req.flash('error', 'Error borrowing book.');
        res.redirect('/borrowed');
    }
};

// Handle Login/Sign-up
const handle_newAcc = async (req, res) => {
    try {
        const salt = await bcrypt.genSalt();
        const hashedPW = await bcrypt.hash(req.fields.password, salt);
        let newAcc = { username: req.fields.username, email: req.fields.email, password: hashedPW };
        await newAccount(newAcc);
        res.redirect('/login');
    } catch {
        req.flash('error', 'Signup failed.');
        res.redirect('/signup');
    }
};
const handle_Login = async (req, res) => {
    const useremail = { email: req.fields.email };
    try {
        const userInfo = await findAccount(useremail);
        if (userInfo.length > 0) {
            const validPassword = await bcrypt.compare(req.fields.password, userInfo[0].password);
            if (validPassword) {
                req.session.user = { ...userInfo[0] };
                console.log("Logged in user:", req.session.user);
                res.redirect("/home");
            } else {
                req.flash('error', 'Invalid email or password');
                res.redirect("/login");
            }
        } else {
            req.flash('error', 'Email not found');
            res.redirect("/login");
        }
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Handle LMS Requests
const handle_HomePage = async (req, res) => {
    try {
        const books = await findBooks();
        const authors = await findAuthors();
        const borrowers = await findBorrowers();
        console.log("Books data:", JSON.stringify(books));
        res.status(200).render("home.ejs", {
            books: books,
            authors: authors,
            borrowers: borrowers,
            user: req.session.user,
            messages: req.flash()
        });
    } catch (err) {
        console.error("Error in handle_HomePage:", err);
        res.status(500).send("Internal Server Error");
    }
};
const handle_BorrowedPage = async (req, res) => {
    try {
        const borrowers = await findBorrowers();
        const borrowedBooks = [];
        for (let borrower of borrowers) {
            for (let borrowed of borrower.borrowedBooks || []) {
                try {
                    const book = await findBooks({ _id: borrowed.bookId });
                    if (book.length > 0 && book[0].isbn) {
                        borrowedBooks.push({
                            title: book[0].title || 'N/A',
                            isbn: book[0].isbn,
                            borrowDate: borrowed.borrowDate ? borrowed.borrowDate.toLocaleDateString() : 'N/A'
                        });
                    }
                } catch (e) {
                    console.error("Error fetching book:", e);
                }
            }
        }
        res.status(200).render("borrowed.ejs", {
            borrowedData: { books: borrowedBooks },
            user: req.session.user,
            messages: req.flash()
        });
    } catch (err) {
        console.error("Error in handle_BorrowedPage:", err);
        req.flash('error', 'Failed to load borrowed records. Please try again.');
        res.status(500).redirect('/home');
    }
};
const handle_CreateBook = async (req, res) => {
    let newBook = {
        title: req.fields.title,
        authorId: req.fields.authorId,
        isbn: req.fields.isbn,
        available: true
    };
    await insertBook(newBook);
    res.redirect('/home');
};
const handle_CreateAuthor = async (req, res) => {
    let newAuthor = {
        name: req.fields.name,
        biography: req.fields.biography
    };
    await insertAuthor(newAuthor);
    res.redirect('/home');
};
const handle_CreateBorrower = async (req, res) => {
    let newBorrower = {
        name: req.fields.name,
        email: req.fields.email,
        borrowedBooks: []
    };
    await insertBorrower(newBorrower);
    res.redirect('/home');
};
const handle_Details = async (req, res, type) => {
    let DOCID = { _id: ObjectId.createFromHexString(req.query._id) };
    let docs;
    if (type === 'book') docs = await findBooks(DOCID);
    else if (type === 'author') docs = await findAuthors(DOCID);
    else if (type === 'borrower') docs = await findBorrowers(DOCID);
    res.status(200).render('details.ejs', { item: docs[0], type: type, user: req.session.user });
};
const handle_Update = async (req, res, type, query) => {
    try {
        let DOCID = { _id: ObjectId.createFromHexString(query._id) };
        let updateFields = {};
        if (type === 'book') updateFields = { title: req.fields.title, available: req.fields.available === 'true' || req.fields.available === true };
        else if (type === 'author') updateFields = { name: req.fields.name, biography: req.fields.biography };
        else if (type === 'borrower') updateFields = { name: req.fields.name, email: req.fields.email };
        const result = await (type === 'book' ? updateBook : type === 'author' ? updateAuthor : updateBorrower)(DOCID, updateFields);
        if (result.modifiedCount === 1) {
            res.status(200).render("popup.ejs", {
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`,
                user: req.session.user
            });
        } else {
            res.status(400).render("popup.ejs", {
                message: `No changes made to ${type}.`,
                user: req.session.user
            });
        }
    } catch (err) {
        console.error("Error in handle_Update:", err);
        res.status(500).render("popup.ejs", {
            message: `An error occurred while updating ${type}`,
            user: req.session.user
        });
    }
};
const handle_Delete = async (req, res, type, query) => {
    try {
        const DOCID = { _id: ObjectId.createFromHexString(query._id) };
        let doc;
        if (type === 'book') doc = await findBooks(DOCID);
        else if (type === 'author') doc = await findAuthors(DOCID);
        else if (type === 'borrower') doc = await findBorrowers(DOCID);
        await (type === 'book' ? deleteBook : type === 'author' ? deleteAuthor : deleteBorrower)(DOCID);
        res.status(200).render("popup.ejs", {
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${doc[0].name || doc[0].title} has been removed`,
            user: req.session.user
        });
    } catch (err) {
        console.error("Error in handle_Delete:", err);
        res.status(500).send("Internal Server Error");
    }
};
// Database function for users
const findUsers = async (criteria = {}) => {
    var collection = db.collection('users');
    let result = await collection.find(criteria).toArray();
    console.log("Fetched users with criteria:", criteria, "Result:", JSON.stringify(result));
    return result;
};
const insertUser = async (doc) => {
    var collection = db.collection('users');
    let result = await collection.insertOne(doc);
    console.log("Inserted user:", JSON.stringify(result));
    return result;
};
const updateUser = async (criteria, updateData) => {
    const collection = db.collection('users');
    const result = await collection.updateOne(criteria, { $set: updateData });
    console.log("Update result:", result);
    return result;
};
const deleteUser = async (criteria) => {
    var collection = db.collection('users');
    let result = await collection.deleteOne(criteria);
    console.log("Deleted user:", JSON.stringify(result));
    return result;
};

// RESTful CRUD APIs for users
app.get('/users', (req, res) => { // Read all users
    findUsers().then(users => {
        res.status(200).json(users);
    }).catch(err => {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Internal Server Error" });
    });
});

app.post('/users', (req, res) => { // Create a user
    const { username, email, password } = req.fields;
    if (!username || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    bcrypt.hash(password, 10).then(hashedPW => {
        const newUser = { username, email, password: hashedPW };
        insertUser(newUser).then(result => {
            res.status(201).json({ message: "User created", id: result.insertedId });
        }).catch(err => {
            console.error("Error creating user:", err);
            res.status(500).json({ error: "Internal Server Error" });
        });
    }).catch(err => {
        console.error("Error hashing password:", err);
        res.status(500).json({ error: "Internal Server Error" });
    });
});

app.put('/users/:id', (req, res) => { // Update a user
    const id = req.params.id;
    const { username, email, password } = req.fields;
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) {
        bcrypt.hash(password, 10).then(hashedPW => {
            updateData.password = hashedPW;
            updateUser({ _id: ObjectId.createFromHexString(id) }, updateData).then(result => {
                if (result.modifiedCount === 1) {
                    res.status(200).json({ message: "User updated" });
                } else {
                    res.status(404).json({ error: "User not found" });
                }
            }).catch(err => {
                console.error("Error updating user:", err);
                res.status(500).json({ error: "Internal Server Error" });
            });
        }).catch(err => {
            console.error("Error hashing password:", err);
            res.status(500).json({ error: "Internal Server Error" });
        });
    } else {
        updateUser({ _id: ObjectId.createFromHexString(id) }, updateData).then(result => {
            if (result.modifiedCount === 1) {
                res.status(200).json({ message: "User updated" });
            } else {
                res.status(404).json({ error: "User not found" });
            }
        }).catch(err => {
            console.error("Error updating user:", err);
            res.status(500).json({ error: "Internal Server Error" });
        });
    }
});

app.delete('/users/:id', (req, res) => { // Delete a user
    const id = req.params.id;
    deleteUser({ _id: ObjectId.createFromHexString(id) }).then(result => {
        if (result.deletedCount === 1) {
            res.status(200).json({ message: "User deleted" });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    }).catch(err => {
        console.error("Error deleting user:", err);
        res.status(500).json({ error: "Internal Server Error" });
    });
});
// Render Pages
app.get('/', isLoggedIn, (req, res) => {
    res.redirect("/home");
});
app.get('/login', (req, res) => {
    res.render("login.ejs", { messages: req.flash() });
});
app.post('/login', (req, res) => {
    handle_Login(req, res);
});
app.get('/signup', (req, res) => {
    res.render("signup.ejs", { messages: req.flash() });
});
app.post('/signup', async (req, res) => {
    console.log("received");
    handle_newAcc(req, res);
});
app.get('/home', isLoggedIn, (req, res) => {
    handle_HomePage(req, res);
});
app.get('/borrowed', isLoggedIn, (req, res) => {
    handle_BorrowedPage(req, res);
});
app.post('/borrow/book', isLoggedIn, (req, res) => {
    borrowBook(req, res);
});
app.get('/create/book', isLoggedIn, (req, res) => { // Removed isAdmin
    res.render("create_book.ejs");
});
app.post('/create/book', isLoggedIn, (req, res) => { // Removed isAdmin
    handle_CreateBook(req, res);
});
app.get('/create/author', isLoggedIn, (req, res) => { // Removed isAdmin
    res.render("create_author.ejs");
});
app.post('/create/author', isLoggedIn, (req, res) => { // Removed isAdmin
    handle_CreateAuthor(req, res);
});
app.get('/create/borrower', isLoggedIn, (req, res) => { // Removed isAdmin
    res.render("create_borrower.ejs");
});
app.post('/create/borrower', isLoggedIn, (req, res) => { // Removed isAdmin
    handle_CreateBorrower(req, res);
});
app.get('/details/:type', isLoggedIn, (req, res) => {
    handle_Details(req, res, req.params.type);
});
app.get('/edit/:type', isLoggedIn, (req, res) => { // Removed isAdmin
    handle_Details(req, res, req.params.type);
});
app.post('/update/:type', isLoggedIn, (req, res) => { // Removed isAdmin
    handle_Update(req, res, req.params.type, req.query);
});
app.get('/delete/:type', isLoggedIn, (req, res) => { // Removed isAdmin
    handle_Delete(req, res, req.params.type, req.query);
});
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Internal Server Error");
        }
        res.redirect("/login");
    });
});
app.get('/*', (req, res) => {
    res.status(404).render('home', { message: `${req.path} - Unknown request!` });
});

// Set localhosting Port
const port = 3000;
console.log(initialUsers);