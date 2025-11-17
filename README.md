# Library Management System

## 1. Project file Info
- *Project Name*: Library Management System
- *Group Info*:
  - Group No.: 19
  - Students' Names and SIDs:
    - Student 1: [Ho Ch], SID: [13136451]
    - Student 2: [Au Pak Yu], SID: [13137320]
    - Student 3: [Yuen Ching Hin], SID: [13133100]

## 2. Project File Intro
- *server.js*: This file serves as the main server script, implemented using Node.js and Express. It provides RESTful CRUD services for the users collection, including GET /users (read all users), POST /users (create a user), PUT /users/:id (update a user), and DELETE /users/:id (delete a user). Additionally, it manages book, author, and borrower data with functionalities such as creating, updating, deleting, and displaying borrowed records. The server connects to a MongoDB database and renders EJS templates for the web interface.
- *package.json*: This file lists the project dependencies, including express, express-session, express-formidable, mongodb, bcrypt, passport, express-flash, and connect-mongodb-session. It also defines the start script (npm start) to launch the server. And also the name of package and version.
- *public (folder)*: Contains static files such as CSS (style/main.css) and (style/login.js) to style and enhance the web interface with animated background shapes and navigation functionality.
- *views (folder)*: Includes EJS template files such as home.ejs, borrowed.ejs, login.ejs, signup.ejs, create_book.ejs, create_author.ejs, create_borrower.ejs, details.ejs, and popup.ejs. These files render the user interface for the home page, borrowed records, login/signup forms, and CRUD operations.
- *models (folder)*: contains "library.js", which is a backend module that defines and exports Mongoose schemas and models for managing a library system.he module includes two schemas: one for books and another for users

## 3. The Cloud-Based Server URL (for Testing)
- *Note*: As this is a local development setup, no cloud deployment is currently active. For testing purposes, use the local server URL:
  - http://localhost:3000
- *Future Deployment*: Once deployed to a cloud platform, the URL will be https://three81-group19.onrender.com.

## 4. Operation Guides

### Use of Login/Logout Pages
- *Valid Login Information*:
  - Email: 123@test.com, Password: 123
  - Email: 1234@test.com, Password: 1234
- *Sign-in Steps*:
  1. Open a web browser and navigate to http://localhost:3000/login.
  2. Enter a valid email and password in the login form.
  3. Click the "Login" button to access the home page.
  4. To log out, click the "Logout" link on any page to return to the login page..

### Use of Your CRUD Web Pages
- *Home Page (/home)*:
  - *Read*: Displays a table of books, authors, and borrowers. Click the "Details" link next to each item to view details.
  - *Create*: Use the "Create Book", "Create Author", or "Create Borrower" links to access respective creation forms. Fill in the form fields and submit to add new records.
  - *Update*: Click "Edit" next to an item to view its details, modify fields, and submit the update form.
  - *Delete*: Click "Delete" next to an item to remove it after confirmation.
- *Borrowed Records Page (/borrowed)*:
  - *Read*: Displays a table of borrowed books with titles, ISBNs, and borrow dates.
  - *Create*: Not applicable; borrowing is handled via the home page or API.
  - *Update/Delete*: Not directly supported; manage via the home page or API.

### Use of Your RESTful CRUD Services
- *Lists of APIs*:
  - *Read*: GET /users - Retrieve all users.
  - *Create*: POST /users - Create a new user.
  - *Update*: PUT /users/:id - Update an existing user by ID.
  - *Delete*: DELETE /users/:id - Delete a user by ID.
- *HTTP Request Types*:
  - GET: Read operation.
  - POST: Create operation.
  - PUT: Update operation.
  - DELETE: Delete operation.
- *Path URI*:
  - /users: For reading all users or creating a new user.
  - /users/:id: For updating or deleting a specific user (replace :id with the user's _id).
- *How to Test Them*:
  - *Prerequisites*: Ensure the server is running (npm start) at http://localhost:3000.
  - *Tools*: Use Postman, cURL, or a similar HTTP client.
- *cURL Testing Commands*:
- (Read)curl http://localhost:3000/users
-   (Create)curl -X POST http://localhost:3000/users -d "username=testuser" -d "email=test@example.com" -d "password=testpass"
- (Updated)curl -X PUT http://localhost:3000/users/<user_id> -d"email=newemail@example.com" 
-(delete)curl -X DELETE http://localhost:3000/users/<user_id>
