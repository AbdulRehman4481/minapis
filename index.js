import express, { query } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import path from "path";
import admin from "firebase-admin";
import pkg from "pg"; // Import pg as a package
import { sendNotification } from "./src/helpers/Notify.js";
import { scheduleNotifications } from "./src/utils/ScheduleNotification.js";

const { Pool } = pkg; // Destructure Pool from the imported package
// 
dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the PostgreSQL connection pool
const pool = new Pool({
  connectionString:
    "postgresql://postgres.fnxjdelrsqfyfedgksns:vERYdCzjcXKvmd9f@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" ,
});

// Verify connection to the database on server start
pool.connect((err, client, release) => {
  if (err) {
    console.error("Database connection error:", err.stack);
    process.exit(1); // Exit if there is a connection error
  } else {
    console.log("Database connected successfully");
    release();
  }
});

const serviceAccount = path.resolve("./firebaseServiceAccount.json"); // Update with your Firebase service account key file path

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Default route
app.get("/", async (req, res) => {
  res.send("Hello World");
});

// start of api
//user api for post
app.post("/api/admin", async (req, res) => {
  const {
    admin_name,
    admin_email,
    admin_password,
    admin_emergency_no,
    admin_role,
    user_name,
  } = req.body;

  const query = `
    INSERT INTO admin (admin_name,
    admin_email,
    admin_password,
    admin_emergency_no,
    user_name,
    admin_role)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `;
  const values = [
    admin_name,
    admin_email,
    admin_password,
    admin_emergency_no,
    user_name,
    admin_role,
  ];

  try {
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]); // Return the newly added user
  } catch (err) {
    console.error("Database insert error:", err.stack);
    res
      .status(500)
      .json({ error: "Database insert error", details: err.message });
  }
});
//end user post api

// user api for fetch
// app.get("/api/users", async (req, res) => {
//   const query = `SELECT * FROM users`;

//   try {
//     const result = await pool.query(query);
//     res.status(200).json(result.rows); // Return all users
//   } catch (err) {
//     console.error("Database fetch error:", err.stack);
//     res
//       .status(500)
//       .json({ error: "Database fetch error", details: err.message });
//   }
// });
// app.put("/api/admin/:id", async (req, res) => {
//   const { id } = req.params;
//   const {
//     admin_name,
//     admin_email,
//     admin_password,
//     admin_admin_emergency_no,
//     admin_role,
//   } = req.body;

//   // Initialize an array to hold the fields to update
//   const fieldsToUpdate = [];
//   const values = [];

//   // Conditionally add each field if it is provided in the request body
//   if (admin_name !== undefined) {
//     fieldsToUpdate.push("admin_name = $"+(fieldsToUpdate.length + 1));
//     values.push(admin_name);
//   }
//   if (admin_email !== undefined) {
//     fieldsToUpdate.push("admin_email = $"+(fieldsToUpdate.length + 1));
//     values.push(admin_email);
//   }
//   if (admin_password !== undefined) {
//     fieldsToUpdate.push("admin_password = $"+(fieldsToUpdate.length + 1));
//     values.push(admin_password);
//   }
//   if (admin_admin_emergency_no !== undefined) {
//     fieldsToUpdate.push("admin_admin_emergency_no = $"+(fieldsToUpdate.length + 1));
//     values.push(admin_admin_emergency_no);
//   }
//   if (admin_role !== undefined) {
//     fieldsToUpdate.push("admin_role = $"+(fieldsToUpdate.length + 1));
//     values.push(admin_role);
//   }

//   // If there are no fields to update, return an error
//   if (fieldsToUpdate.length === 0) {
//     return res.status(400).json({ error: "No fields provided to update" });
//   }

//   // Add the id as the last value for the WHERE clause
//   values.push(id);

//   // Construct the query dynamically
//   const query = `
//     UPDATE admin
//     SET ${fieldsToUpdate.join(", ")}
//     WHERE id = $${fieldsToUpdate.length + 1}
//     RETURNING *
//   `;

//   try {
//     const result = await pool.query(query, values);

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Admin not found" });
//     }

//     res.status(200).json(result.rows[0]); // Return the updated admin
//   } catch (err) {
//     console.error("Database update error:", err.stack);
//     res.status(500).json({ error: "Database update error", details: err.message });
//   }
// });

app.post("/api/contact", async (req, res) => {
  const { userName, companyName, phoneNumber, email, message } = req.body;

  const query = `
    INSERT INTO contact_data ( userName,
  companyName,
  phoneNumber,
  email,
  message)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `;
  const values = [userName, companyName, phoneNumber, email, message];

  try {
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]); // Return the newly added user
  } catch (err) {
    console.error("Database insert error:", err.stack);
    res
      .status(500)
      .json({ error: "Database insert error", details: err.message });
  }
});
app.post("/api/community", async (req, res) => {
  const { email } = req.body;

  const query = `
    INSERT INTO community_data ( email )
    VALUES ($1) RETURNING *
  `;
  const values = [email];

  try {
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]); // Return the newly added user
  } catch (err) {
    console.error("Database insert error:", err.stack);
    res
      .status(500)
      .json({ error: "Database insert error", details: err.message });
  }
});

//user api for update end

// POST API to create a new package
app.post("/api/packages", async (req, res) => {
  const {
    package_name,
    short_desc,
    amount_monthly,
    yearly_discount,
    users_allowed,
    features,
  } = req.body;

  // Validate all required fields
  if (
    !package_name ||
    !short_desc ||
    !amount_monthly ||
    !users_allowed ||
    !features
  ) {
    return res
      .status(400)
      .json({ error: "All required fields must be provided." });
  }

  const query = `
    INSERT INTO packages (package_name, short_desc, amount_monthly, yearly_discount, users_allowed, features)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `;
  const values = [
    package_name,
    short_desc,
    amount_monthly,
    yearly_discount,
    users_allowed,
    JSON.stringify(features),
  ];

  try {
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]); // Return the newly created package
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET API to fetch all packages
app.get("/api/packages", async (req, res) => {
  const query = `SELECT * FROM packages`;

  try {
    const result = await pool.query(query);
    res.status(200).json(result.rows); // Return all packages
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete package
app.delete("/api/packages/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM packages WHERE package_id = $1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Package not found" });
    }
    res.status(200).json({
      message: "Package deleted successfully",
      package: result.rows[0],
    });
  } catch (err) {
    console.error("Error deleting package:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/packages/:id", async (req, res) => {
  const { id } = req.params; // Get the package ID from the request parameters
  const query = `SELECT * FROM packages WHERE package_id = $1`;

  try {
    const result = await pool.query(query, [id]); // Pass the ID as a parameter to the query

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Package not found" }); // Handle case where no package is found
    }

    res.status(200).json(result.rows[0]); // Return the first row (single package)
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Update package
app.put("/api/packages/:id", async (req, res) => {
  const { id } = req.params;
  const {
    package_name,
    short_desc,
    amount_monthly,
    yearly_discount,
    users_allowed,
    features,
  } = req.body;

  // Validate the input
  if (!package_name || amount_monthly == null || users_allowed == null) {
    return res.status(400).json({
      error: "Package name, amount monthly, and users allowed are required",
    });
  }

  try {
    // Convert features array of objects to a string format
    const featuresList = JSON.stringify(features); // Convert features to a JSON string

    console.log("Updating package with ID:", id, "with values:", [
      package_name,
      short_desc,
      amount_monthly,
      yearly_discount,
      users_allowed,
      featuresList, // Use the stringified features
    ]);

    // Update the package in the database
    const result = await pool.query(
      `UPDATE packages
       SET package_name = $1,
           short_desc = $2,
           amount_monthly = $3,
           yearly_discount = $4,
           users_allowed = $5,
           features = $6
       WHERE package_id = $7 RETURNING *`,
      [
        package_name,
        short_desc,
        amount_monthly,
        yearly_discount,
        users_allowed,
        featuresList,
        id,
      ] // Pass the JSON stringified features
    );

    // Check if the package was found and updated
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Return the updated package
    res.status(200).json({
      message: "Package updated successfully",
      package: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating package:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

//consumer api start
// app.post("/api/consumers", async (req, res) => {
//   const {
//     username,
//     name,
//     relationship,
//     role,
//     ageGroup,
//     emergency_contact,
//     password,
//     preferenceForms,
//     admin_id,
//   } = req.body;

//   try {
//     console.log(role);

//     // Check if username already exists
//     const userCheck = await pool.query(
//       "SELECT * FROM users WHERE user_name = $1",
//       [username]
//     );
//     if (userCheck.rows.length > 0) {
//       return res.status(400).json({ message: "Username already exists" });
//     }

//     // Hash the password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Insert into the users table and get the user ID
//     const userResult = await pool.query(
//       `INSERT INTO users (user_name, user_password, user_emergency_contact_information, user_role)
//        VALUES ($1, $2, $3, 'consumer')
//        RETURNING id`,
//       [username, hashedPassword, emergency_contact]
//     );

//     const userId = userResult.rows[0].id;

//     // Insert into the consumers table using the retrieved user ID
//     const consumerResult = await pool.query(
//       `INSERT INTO consumers (name, username, relationship, role, age_group, emergency_contact, password, preferences, admin_id, user_id)
//        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
//        RETURNING *`,
//       [
//         name,
//         username,
//         relationship,
//         role,
//         ageGroup,
//         emergency_contact,
//         hashedPassword,
//         JSON.stringify(preferenceForms),
//         admin_id,
//         userId,
//       ]
//     );

//     const newConsumer = consumerResult.rows[0]; // Contains the newly created consumer data

//     // Send success response
//     res.status(201).json({
//       message: "Consumer and user data saved successfully!",
//       consumer: newConsumer,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Error saving consumer and user data.",
//       error: error.message,
//     });
//   }
// });

app.post("/api/consumers", async (req, res) => {
  const {
    fullname,
    username,
    password,
    consumertype,
    diagnosis,
    gender,
    support,
    language_spoken,
    relationship,
    preferenceForms,
    admin_id,
  } = req.body;

  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert into the consumers table
    const consumerResult = await pool.query(
      `INSERT INTO consumers (fullname, username,password, relationship, consumer_type, diagnosis, gender, support, language_spoken, preferences, admin_id,communication_preference,
    interests_preferences,
    sensory_preferences,
    dietary_preferences,
    social_preferences,
    emergency_information,
    learning_preferences,
    routines_preferences)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        fullname,
        username,
        hashedPassword,
        relationship,
        consumertype,
        diagnosis,
        gender,
        support,
        JSON.stringify(language_spoken),
        JSON.stringify(preferenceForms),
        admin_id,
        JSON.stringify(preferenceForms),
        JSON.stringify(preferenceForms),
        JSON.stringify(preferenceForms),
        JSON.stringify(preferenceForms),
        JSON.stringify(preferenceForms),
        JSON.stringify(preferenceForms),
        JSON.stringify(preferenceForms),
        JSON.stringify(preferenceForms),
      ]
    );

    const newConsumer = consumerResult.rows[0]; // Contains the newly created consumer data

    // Send success response
    res.status(201).json({
      message: "Consumer data saved successfully!",
      consumer: newConsumer,
    });
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      res.status(400).json({
        message: "Username already exists. Please choose a different one.",
      });
    } else {
      res.status(500).json({
        message: "Error saving consumer data.",
        error: error.message,
      });
    }
  }
});

// routes/consumerRoutes.js

// Route to check if a username exists

// app.post('/api/consumers', async (req, res) => {
//   const { name, email, relationship, emergency_contact, password, preferenceForms, admin_id } = req.body;

//   try {
//     // Hash the password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // SQL query to insert into both consumers and users
//     const query = `
//       WITH inserted_user AS (
//         INSERT INTO users (user_name, user_email, user_password, user_emergency_contact_information, user_role)
//         VALUES ($1, $2, $3, $4, 'consumer')
//         RETURNING id
//       )
//       INSERT INTO consumers (name, email, relationship, emergency_contact, password, preferences, admin_id, user_id)
//       VALUES ($5, $6, $7, $8, $9, $10, $11, (SELECT id FROM inserted_user))
//       RETURNING *;
//     `;

//     // Execute the query with correct parameter alignment
//     const result = await pool.query(query, [
//       name,                        // $1 -> users table: user_name
//       email,                       // $2 -> users table: user_email
//       hashedPassword,              // $3 -> users table: user_password
//       emergency_contact,           // $4 -> users table: user_emergency_contact_information

//       name,                        // $5 -> consumers table: name
//       email,                       // $6 -> consumers table: email
//       relationship,                // $7 -> consumers table: relationship
//       emergency_contact,           // $8 -> consumers table: emergency_contact
//       hashedPassword,              // $9 -> consumers table: password
//       JSON.stringify(preferenceForms), // $10 -> consumers table: preferences
//       admin_id                     // $11 -> consumers table: admin_id
//     ]);

//     const newUser = result.rows[0]; // Contains the newly created consumer data

//     res.status(201).json({
//       message: 'Consumer and user data saved successfully!',
//       user: newUser
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error saving consumer and user data.', error: error.message });
//   }
// });

app.get("/api/consumers", async (req, res) => {
  // Get admin_id from the Authorization header
  const admin_id = req.headers.authorization?.split(" ")[1]; // assuming "Bearer {admin_id}"

  if (!admin_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM consumers WHERE admin_id = $1",
      [admin_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error retrieving consumer data:", error);
    res.status(500).json({ message: "Error retrieving consumer data.", error });
  }
});
app.get("/api/allconsumers", async (req, res) => {
  // Get admin_id from the Authorization header
  try {
    const result = await pool.query("SELECT * FROM consumers");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error retrieving consumer data:", error);
    res.status(500).json({ message: "Error retrieving consumer data.", error });
  }
});

app.get("/api/consumers/:id", async (req, res) => {
  // Get admin_id from the Authorization header

  try {
    const result = await pool.query("SELECT * FROM consumers where id = $1", [
      req.params.id,
    ]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error retrieving consumer data:", error);
    res.status(500).json({ message: "Error retrieving consumer data.", error });
  }
});

//delete api for get consumer
app.delete("/api/consumers/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM consumers WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Consumer not found." });
    }

    res.status(200).json({
      message: "Consumer deleted successfully!",
      deletedConsumer: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting consumer:", error);
    res
      .status(500)
      .json({ message: "Error deleting consumer.", error: error.message });
  }
});

//end api for get consumer

app.put("/api/consumers/:id", async (req, res) => {
  const { id } = req.params;
  const {
    fullname,
    username,
    consumer_type,
    diagnosis,
    gender,
    support,
    language_spoken,
    relationship,
    preferenceForms,
    admin_id,
    password,
    communication_preference,
    interests_preferences,
    sensory_preferences,
          dietary_preferences,
          social_preferences,
          emergency_information,
          learning_preferences,
          routines_preferences,
          memory_preferences
  } = req.body;

  try {
    let hashedPassword = password;

    // Check if the password is already hashed
    if (password && !(password.startsWith('$2') && password.length === 60)) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }
    await pool.query("BEGIN");
    const consumerResult = await pool.query(
      `UPDATE consumers
       SET fullname = $1, 
           username = $2, 
           relationship = $3, 
           consumer_type = $4, 
           diagnosis = $5, 
           gender = $6, 
           support = $7, 
           language_spoken = $8, 
           preferences = $9, 
           admin_id = $10,
           password = $11,
           communication_preference=$13,
          interests_preferences=$14,
          sensory_preferences=$15,
          dietary_preferences=$16,
          social_preferences=$17,
          emergency_information=$18,
          learning_preferences=$19,
          routines_preferences=$20,
          memory_preferences=$21
       WHERE id = $12
       RETURNING *`,
      [
        fullname,
        username,
        relationship,
        consumer_type,
        diagnosis,
        gender,
        support,
        language_spoken,
        JSON.stringify(preferenceForms),
        admin_id,
        hashedPassword,
        id,
        communication_preference,
        interests_preferences,
        sensory_preferences,
        dietary_preferences,
        social_preferences,
        emergency_information,
        learning_preferences,
        routines_preferences,
        memory_preferences
      ]
    );

    if (consumerResult.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Consumer not found." });
    }

    const updatedConsumer = consumerResult.rows[0];

    await pool.query("COMMIT"); // Commit transaction if everything is successful

    res.status(200).json({
      message: "Consumer updated successfully!",
      consumer: updatedConsumer,
    });
  } catch (error) {
    await pool.query("ROLLBACK"); // Rollback transaction on error
    console.error("Error updating consumer:", error);
    res.status(500).json({
      message: "Error updating consumer.",
      error: error.message,
    });
  }
});
app.post("/api/tasks", async (req, res) => {
  const { tasks_data, consumerId, admin_id } = req.body;

  try {
    const userQuery = `
      SELECT * FROM consumers WHERE id = $1
    `;
    const userResult = await pool.query(userQuery, [consumerId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Consumer not found." });
    }

    const userId = userResult.rows[0].id;
    console.log(userId);

    // Step 2: Insert into tasks table with retrieved user_id
    const query = `
      INSERT INTO tasks (tasks_data, consumer_id,  admin_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [tasks_data, consumerId, admin_id];
    const result = await pool.query(query, values);
    console.log(result.rows[0]);

    const createdTask = result.rows[0];
    scheduleNotifications(createdTask, userResult.rows[0].device_token);
console.log(createdTask)
    res.status(201).json(createdTask);

  } catch (error) {
    console.error("Error creating task:", error);
    res
      .status(500)
      .json({ message: "Error creating task.", error: error.message });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params; // Get the task ID from the URL
  const { tasks_data, consumerId, admin_id } = req.body;

  try {
    const query = `
      UPDATE tasks
      SET tasks_data = $1,
          consumer_id = $2,
          admin_id = $3
      WHERE id = $4
      RETURNING *
    `;
    const values = [tasks_data, consumerId, admin_id, id]; // Add task_img to the values array
    const result = await pool.query(query, values);
    const createdTask = result.rows[0];
    scheduleNotifications(createdTask, userResult.rows[0].device_token);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.status(200).json(result.rows[0]); // Return the updated task
  } catch (error) {
    console.error("Error updating task:", error);
    res
      .status(500)
      .json({ message: "Error updating task.", error: error.message });
  }
});

app.get("/api/tasks", async (req, res) => {
  try {
    // Assuming you're getting the admin_id from the session or request
    const admin_id = req.headers.authorization?.split(" ")[1];
    if (!admin_id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Admin ID not found" });
    }
    // Query to fetch tasks only for the logged-in admin
    const query = `
    SELECT tasks.*, consumers.fullname AS consumer_name
    FROM tasks
    JOIN consumers ON tasks.consumer_id = consumers.id
    WHERE tasks.admin_id = $1`;
    const result = await pool.query(query, [admin_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res
      .status(500)
      .json({ message: "Error fetching tasks", error: error.message });
  }
});
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No tasks found for this user." });
    }

    console.log(result.rows[0]);

    res.status(200).json(result.rows); // Return all tasks associated with the user
  } catch (error) {
    console.error("Error retrieving task data:", error);
    res
      .status(500)
      .json({ message: "Error retrieving task data.", error: error.message });
  }
});
app.get("/api/tasksuser/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks WHERE admin_id = $1", [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No tasks found for this user." });
    }

    res.status(200).json(result.rows); // Return all tasks associated with the user
  } catch (error) {
    console.error("Error retrieving task data:", error);
    res
      .status(500)
      .json({ message: "Error retrieving task data.", error: error.message });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params; // Get the task ID from the URL
  try {
    const admin_id = req.headers.authorization?.split(" ")[1];
    if (!admin_id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Admin ID not found" });
    }
    const query = `
      DELETE FROM tasks
      WHERE id = $1 AND admin_id = $2
      RETURNING *
    `;
    const values = [id, admin_id];
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res
      .status(500)
      .json({ message: "Error deleting task", error: error.message });
  }
});

// donotdisturb api

app.post("/api/consumers/donotdisturb", async (req, res) => {
  const { startTime, endTime, consumer_id, admin_id } = req.body;

  // Basic validation
  if (!startTime || !endTime || !consumer_id || !admin_id) {
    return res.status(400).json({
      message:
        "All fields are required: startTime, endTime, user_id, and admin_id",
    });
  }

  try {
    // Insert or update Do Not Disturb settings for the user
    const query = `
      INSERT INTO donotdisturb (consumer_id, admin_id, start_time, end_time)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (consumer_id, admin_id) 
      DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time
    `;

    const result = await pool.query(query, [
      consumer_id,
      admin_id,
      startTime,
      endTime,
    ]);

    // Return a success message
    res.status(200).json({
      message: "Do Not Disturb settings saved successfully",
      data: {
        consumer_id,
        admin_id,
        startTime,
        endTime,
      },
    });
  } catch (error) {
    console.error("Error saving Do Not Disturb settings:", error);
    res.status(500).json({
      message: "Error saving Do Not Disturb settings",
      error: error.message,
    });
  }
});

//consumer count
// app.get("/api/consumers/count/:admin_id", async (req, res) => {
//   const { admin_id } = req.params; // Retrieve admin_id from request query or session (e.g., next-auth session)
//   try {
//     // Step 1: Get the consumer count from the consumers table
//     const consumerResult = await pool.query(
//       "SELECT COUNT(*) AS consumer_count FROM consumers WHERE admin_id = $1",
//       [admin_id]
//     );
//     const consumerCount = parseInt(consumerResult.rows[0].consumer_count, 10); // Convert to integer
//     // Step 2: Get the users_allowed from the packages table
//     const packageResult = await pool.query(
//       "SELECT allowed_users FROM package_purchases WHERE admin_id = $1",
//       [admin_id]
//     );
//     if (packageResult.rowCount === 0) {
//       return res.status(404).json({
//         message: "No package found for the admin",
//       });
//     }
//     const usersAllowed = parseInt(packageResult.rows[0].allowed_users, 10); // Convert to integer
//     // Step 3: Compare consumer count with users_allowed
//     const exceedsLimit = consumerCount >= usersAllowed;
//     // Step 4: Respond with the comparison result
//     res.status(200).json({
//       message: exceedsLimit
//         ? "Consumer count exceeds the allowed limit"
//         : "Consumer count is within the allowed limit",
//       consumerCount,
//       usersAllowed,
//       exceedsLimit,
//     });
//   } catch (error) {
//     console.error("Error fetching consumer count or package:", error);
//     res.status(500).json({
//       message: "Error retrieving data",
//       error: error.message,
//     });
//   }
// });

app.get("/api/consumers/count/:admin_id", async (req, res) => {
  const { admin_id } = req.params; // Retrieve admin_id from the request params

  try {
    // Step 1: Get the consumer count from the consumers table
    const consumerResult = await pool.query(
      "SELECT COUNT(*) AS consumer_count FROM consumers WHERE admin_id = $1",
      [admin_id]
    );
    const consumerCount = parseInt(consumerResult.rows[0].consumer_count, 10); // Convert to integer

    // Step 2: Get the first package_id for the given admin_id from the package_purchases table
    const packagePurchaseResult = await pool.query(
      "SELECT package_id FROM package_purchases WHERE admin_id = $1 ORDER BY package_id LIMIT 1",
      [admin_id]
    );
    if (packagePurchaseResult.rowCount === 0) {
      return res.status(404).json({
        message: "No package found for the admin",
      });
    }
    const packageId = packagePurchaseResult.rows[0].package_id;

    // Step 3: Fetch allowed_users from the packages table using the retrieved package_id
    const packageResult = await pool.query(
      "SELECT users_allowed FROM packages WHERE package_id = $1",
      [packageId]
    );
    if (packageResult.rowCount === 0) {
      return res.status(404).json({
        message: "Package details not found",
      });
    }
    const usersAllowed = parseInt(packageResult.rows[0].users_allowed, 10); // Convert to integer

    // Step 4: Compare consumer count with users_allowed
    const exceedsLimit = consumerCount >= usersAllowed;

    // Step 5: Respond with the comparison result
    res.status(200).json({
      message: exceedsLimit
        ? "Consumer count exceeds the allowed limit"
        : "Consumer count is within the allowed limit",
      consumerCount,
      usersAllowed,
      exceedsLimit,
    });
  } catch (error) {
    console.error("Error fetching consumer count or package:", error);
    res.status(500).json({
      message: "Error retrieving data",
      error: error.message,
    });
  }
});

// app.get('/api/consumers/count/:admin_id', async (req, res) => {
//   const { admin_id } = req.params; // Retrieve admin_id from request query or session (e.g., next-auth session)
//   try {
//     // Step 1: Get the consumer count from the consumers table
//     const consumerResult = await pool.query(
//       'SELECT COUNT(*) AS consumer_count FROM consumers WHERE admin_id = $1',
//       [admin_id]
//     );
//     const consumerCount = parseInt(consumerResult.rows[0].consumer_count, 10); // Convert to integer
//     // Step 2: Get the users_allowed from the packages table
//     const packageResult = await pool.query(
//       'SELECT users_allowed FROM packages WHERE id = $1',
//       ['2']
//     );
//     if (packageResult.rowCount === 0) {
//       return res.status(404).json({
//         message: 'No package found for the admin'
//       });
//     }
//     const usersAllowed = parseInt(packageResult.rows[0].users_allowed, 10); // Convert to integer
//     // Step 3: Compare consumer count with users_allowed
//     const exceedsLimit = consumerCount >= usersAllowed;
//     // Step 4: Respond with the comparison result
//     res.status(200).json({
//       message: exceedsLimit
//         ? 'Consumer count exceeds the allowed limit'
//         : 'Consumer count is within the allowed limit',
//       consumerCount,
//       usersAllowed,
//       exceedsLimit
//     });
//   } catch (error) {
//     console.error('Error fetching consumer count or package:', error);
//     res.status(500).json({
//       message: 'Error retrieving data',
//       error: error.message
//     });
//   }
// });

//purchase api
app.post("/api/purchase", async (req, res) => {
  const { admin_id, package_id, status, created_id } = req.body;

  // Check if all required fields are provided
  if (!admin_id || !package_id) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const query = `
          INSERT INTO package_purchases (admin_id, package_id, status, created_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
      `;
    const values = [admin_id, package_id, status, created_id];
    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      purchase: result.rows[0],
    });
  } catch (error) {
    console.error("Error purchasing package:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/purchase", async (req, res) => {
  const { admin_id, package_id } = req.body;

  // Check for required fields
  if (!admin_id || !package_id) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const query = `
      UPDATE package_purchases
      SET package_id = $2
      WHERE admin_id = $1
      RETURNING *;
    `;
    const values = [admin_id, package_id];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Purchase not found for the given admin ID" });
    }

    res.status(200).json({
      success: true,
      purchase: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/purchase", async (req, res) => {
  // Get admin_id from the Authorization header
  const authHeader = req.headers.authorization;
  const admin_id =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  if (!admin_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM package_purchases WHERE admin_id = $1",
      [admin_id]
    );

    // Check if the user has purchased a package
    if (result.rows.length > 0) {
      return res
        .status(200)
        .json({ hasPurchased: true, purchases: result.rows });
    } else {
      return res.status(200).json({ hasPurchased: false });
    }
  } catch (error) {
    console.error("Error retrieving consumer data:", error);
    res.status(500).json({ message: "Error retrieving consumer data.", error });
  }
});

//consumer task api
// app.get('/tasks', async (req, res) => {
//   try {
//     console.log(req.headers);

//     const consumer_id = req.headers.authorization?.split(" ")[1];
//     if (!consumer_id) {
//       return res
//         .status(401)
//         .json({ message: "Unauthorized: consumer ID not found" });
//     }
//     // Query to fetch tasks only for the specific consumer
//     const query = `
//       SELECT
//        *
//       FROM tasks
//       WHERE tasks.consumer_id = $1
//     `
//     const result = await pool.query(query, [consumer_id])

//     // Format the response
//     const formattedTasks = result.rows.map(task => ({
//       ...task,
//       categories: task.categories.split(',').map(cat => cat.trim()) // Assuming categories are stored as comma-separated string
//     }))

//     res.status(200).json(formattedTasks)
//   } catch (error) {
//     console.error('Error fetching tasks:', error)
//     if (error.name === 'JsonWebTokenError') {
//       res.status(401).json({ message: 'Invalid token' })
//     } else {
//       res.status(500).json({ message: 'Error fetching tasks', error: error.message })
//     }
//   }
// })
app.get("/tasks/:consumer_id", async (req, res) => {
  try {
    const { consumer_id } = req.params; // Extract consumer_id from the URL parameters

    if (!consumer_id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: consumer ID not provided" });
    }

    // Query to fetch tasks only for the specific consumer
    const query = `
      SELECT 
       *
      FROM tasks
      WHERE tasks.consumer_id = $1
    `;

    const result = await pool.query(query, [consumer_id]);

    // Format the response
    // const formattedTasks = result.rows.map(task => ({
    //   ...task,
    //   categories: task.categories.split(',').map(cat => cat.trim()) // Assuming categories are stored as comma-separated string
    // }));

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    if (error.name === "JsonWebTokenError") {
      res.status(401).json({ message: "Invalid token" });
    } else {
      res
        .status(500)
        .json({ message: "Error fetching tasks", error: error.message });
    }
  }
});

//mobile
app.get("/task/:id", async (req, res) => {
  try {
    const { id } = req.params; // Extract 'id' from the URL parameters

    if (!id) {
      return res
        .status(400) // Bad request, since id is required
        .json({ message: "Bad request: Task ID not provided" });
    }

    // Query to fetch the task by the given ID
    const query = `
      SELECT 
        *
      FROM tasks
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res
        .status(404) // Task not found
        .json({ message: "Task not found" });
    }

    // Send the fetched task as a response
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Server error" }); // Internal server error
  }
});

// POST API for form submission
app.post("/api/submit-form", async (req, res) => {
  const {
    fullName,
    email,
    phone,
    role,
    otherRole,
    ageGroup,
    numCareFor,
    primaryCareNeeds,
    support,
    hearAbout,
    otherHearAbout,
    receiveUpdates,
    termsAccepted,
  } = req.body;

  // Check if required fields are provided
  if (!fullName || !email) {
    return res.status(400).json({ error: "Full name and email are required" });
  }

  try {
    // Insert the submission into the database
    const query = `
          INSERT INTO user_submissions (full_name, email, phone, role, other_role, age_group, num_care_for, primary_care_needs, support, hear_about, other_hear_about, receive_updates, terms_accepted)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *;
      `;
    const values = [
      fullName,
      email,
      phone,
      role,
      otherRole,
      ageGroup,
      numCareFor,
      primaryCareNeeds,
      support,
      hearAbout,
      otherHearAbout,
      receiveUpdates,
      termsAccepted,
    ];
    const result = await pool.query(query, values);

    // Return the created submission
    res.status(201).json({
      success: true,
      submission: result.rows[0], // returning the created submission record
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/submissions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM user_submissions");
    res.json(result.rows);
  } catch (error) {
    errorHandler(error, res);
  }
});

//api for superadmin dashboard data

// GET API to retrieve admin count from users table
app.get("/api/admin-count", async (req, res) => {
  try {
    // Query to count users with role = 'admin'
    const { rows } = await pool.query(
      `SELECT COUNT(admin_id) AS adminCount FROM admin WHERE admin_role = $1`,
      ["admin"]
    );

    // Extract the count from the result
    const adminCount = rows[0].admincount;

    // Send the admin count as a response
    res.status(200).json({ success: true, adminCount });
  } catch (error) {
    console.error("Error fetching admin count:", error);
    res.status(500).json({ error: "Failed to fetch admin count" });
  }
});

// Assuming `pool` is already configured with your PostgreSQL connection
// app.get("/api/total-purchase-price", async (req, res) => {
//   try {
//     // SQL query to get the sum of the price column
//     const { rows } = await pool.query(
//       `SELECT SUM(price) AS totalPrice FROM package_purchases`
//     );

//     // Extract the total price from the result
//     const totalPrice = rows[0].totalprice;

//     // Send the total price as a response
//     res.status(200).json({ success: true, totalPrice });
//   } catch (error) {
//     console.error("Error fetching total purchase price:", error);
//     res.status(500).json({ error: "Failed to fetch total purchase price" });
//   }
// });
app.get("/api/total-purchase-price", async (req, res) => {
  try {
    // SQL query to join package_purchases with packages, summing up the prices
    const { rows } = await pool.query(`
      SELECT SUM(packages.amount_monthly) AS totalPrice
      FROM package_purchases
      JOIN packages ON package_purchases.package_id = packages.package_id
    `);

    // Extract the total price from the result
    const totalPrice = rows[0].totalprice;

    // Send the total price as a response
    res.status(200).json({ success: true, totalPrice });
  } catch (error) {
    console.error("Error fetching total purchase price:", error);
    res.status(500).json({ error: "Failed to fetch total purchase price" });
  }
});

app.post("/api/addpreferenceassessment", async (req, res) => {
  const { preferences, admin_id, consumer_id } = req.body;

  try {
    // Insert the submission into the database
    const query = `
        INSERT INTO preference_assessments (
          preference_assessments_created_at,
          preference_assessments_update_at,
          preferences,
          admin_id,
          consumer_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;

    // Assign new dates directly in the array without reassigning
    const values = [
      new Date(), // preference_assessments_created_at
      new Date(), // preference_assessments_update_at
      preferences,
      admin_id,
      consumer_id,
    ];

    const result = await pool.query(query, values);

    // Return the created submission
    res.status(201).json({
      success: true,
      submission: result.rows[0], // returning the created submission record
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/getpreferenceassessment/:admin_id", async (req, res) => {
  // Extract admin_id from route parameters, not from query string
  const { admin_id } = req.params;

  try {
    // Define the query to get preference_assessments based on admin_id
    const query = `
      SELECT * FROM preference_assessments
      WHERE admin_id = $1;
    `;

    // Execute the query with the provided admin_id
    const result = await pool.query(query, [admin_id]);

    // Check if any results were found
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No preference assessments found" });
    }

    // Return the fetched preference_assessments
    res.status(200).json({
      success: true,
      preferenceAssessments: result.rows, // returning the fetched records
    });
  } catch (error) {
    console.error("Error fetching preference assessments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/deletepreferenceassessment/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Delete the record from the database
    const query = `
      DELETE FROM preference_assessments
      WHERE preference_assessments_id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [id]);

    // Check if the record was found and deleted
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    // Return a success response
    res.status(200).json({
      success: true,
      message: "Preference assessment deleted successfully",
      deletedRecord: result.rows[0], // returning the deleted record for reference
    });
  } catch (error) {
    console.error("Error deleting record:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/updatepreferenceassessment/:id", async (req, res) => {
  const { id } = req.params;
  const { preferences, admin_id, consumer_id } = req.body;

  try {
    // Update the record in the database
    const query = `
      UPDATE preference_assessments
      SET 
        preferences = $1,
        admin_id = $2,
        consumer_id = $3,
        preference_assessments_update_at = $4
      WHERE preference_assessments_id = $5
      RETURNING *;
    `;

    // Assign the new values, including the updated timestamp
    const values = [
      preferences,
      admin_id,
      consumer_id,
      new Date(), // preference_assessments_update_at
      id,
    ];

    const result = await pool.query(query, values);

    // Check if the record was found and updated
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    // Return the updated record
    res.status(200).json({
      success: true,
      updatedRecord: result.rows[0], // returning the updated record
    });
  } catch (error) {
    console.error("Error updating record:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/addcheckin", async (req, res) => {
  const { consumer_id, admin_id, reminder } = req.body;
  try {
    // Insert the submission into the database
    const query = `
        INSERT INTO check_in (
        consumer_id,
        admin_id,
        reminder
        )
        VALUES ($1, $2,$3)
        RETURNING *;
    `;

    // Assign new dates directly in the array without reassigning
    const values = [consumer_id, admin_id, JSON.stringify(reminder)];

    const result = await pool.query(query, values);

    // Return the created submission
    res.status(201).json({
      success: true,
      submission: result.rows[0], // returning the created submission record
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/addcheckin/:admin", async (req, res) => {
  const { admin } = req.params;
  try {
    // Corrected SQL query with proper JOIN syntax
    const query = `
      SELECT check_in.*, consumers.fullname 
      FROM check_in 
      JOIN consumers ON check_in.consumer_id = consumers.id 
      WHERE check_in.admin_id = $1
    `;
    const values = [admin];
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json({
        // Use status 200 for successful responses
        success: true,
        submission: result.rows,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "No check-in found for the given admin ID.",
      });
    }
  } catch (error) {
    console.error("Error fetching check-ins:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/addcheckin/:adminId/:id", async (req, res) => {
  const { id } = req.params; // Get the task ID from the URL
  const { adminId } = req.params; // Get the task ID from the URL
  try {
    const query = `
      DELETE FROM check_in
      WHERE check_in_id = $1 AND admin_id = $2
      RETURNING *
    `;
    const values = [id, adminId];
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res
      .status(500)
      .json({ message: "Error deleting task", error: error.message });
  }
});

app.put("/api/addcheckin/:check_in_id", async (req, res) => {
  const { consumer_id, reminder } = req.body; // Make sure 'reminder' is in the expected format
  const { check_in_id } = req.params;

  try {
    // Ensure reminder is an array or adjust according to your database schema
    const query = `
      UPDATE check_in
      SET consumer_id = $2 , reminder = $3
      WHERE check_in_id = $1
      RETURNING *;
    `;
    const values = [check_in_id, consumer_id, JSON.stringify(reminder)]; // Ensure reminder is in a suitable format

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Check-in not found for the given consumer ID" });
    }

    res.status(200).json({
      success: true,
      checkIn: result.rows[0], // Change 'purchase' to 'checkIn' for clarity
    });
  } catch (error) {
    console.error("Error updating check-in:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ai conversatio api
app.post("/api/ai_conversations", async (req, res) => {
  const {
    selected_consumer,
    admin_id,
    preferred_topics,
    conversation_times,
    conversation_time_notes,
    specific_time,
    interaction_frequency,
    frequency_note,
    frequency_range,
    tune_note,
    preferred_tone,
    special_cues,
    topics_to_avoid,
  } = req.body;
  console.log("alldata", req.body);
  try {
    // Step 1: Create the ai_conversations table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ai_conversations (
        conversation_id SERIAL PRIMARY KEY,
        consumer_id INT NOT NULL,
        admin_id INT NOT NULL,
        preferred_topics TEXT,
        conversation_times TEXT,
        conversation_time_notes TEXT,
        specific_time TIMESTAMP,
        interaction_frequency TEXT,
        frequency_note TEXT,
        frequency_range TEXT,
        tune_note TEXT,
        preferred_tone TEXT,
        special_cues TEXT,
        topics_to_avoid TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (consumer_id) REFERENCES consumers(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE
      );
    `;
    await pool.query(createTableQuery);
    // Step 2: Insert into ai_conversations table
    const insertQuery = `
      INSERT INTO ai_conversations (
        consumer_id,
        admin_id,
        preferred_topics,
        conversation_times,
        conversation_time_notes,
        specific_time,
        interaction_frequency,
        frequency_note,
        frequency_range,
        tune_note,
        preferred_tone,
        special_cues,
        topics_to_avoid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      selected_consumer,
      admin_id,
      preferred_topics,
      conversation_times,
      conversation_time_notes,
      specific_time,
      interaction_frequency,
      frequency_note,
      frequency_range,
      tune_note,
      preferred_tone,
      special_cues,
      topics_to_avoid,
    ];
    const result = await pool.query(insertQuery, values);
    res.status(201).json({
      message: "AI conversation created successfully!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating AI conversation:", error);
    res.status(500).json({
      message: "Error creating AI conversation.",
      error: error.message,
    });
  }
});
app.get("/api/admin-users-purchases", async (req, res) => {
  try {
    const query = `
 SELECT
    pp.purchase_id,
    pp.package_id,
    pp.admin_id,
    pp.status,
    pp.created_id AS purchase_created_at,  -- Replace created_at with the actual column name
    SUM(p.amount_monthly) AS total_purchase_amount,
    u.admin_name
FROM package_purchases pp
INNER JOIN packages p ON pp.package_id = p.package_id
INNER JOIN admin u ON pp.admin_id = u.admin_id
GROUP BY pp.purchase_id, pp.package_id, pp.admin_id, pp.status, pp.created_id, u.admin_name;
`;

    const values = ["admin"];

    // Step 1: Check if any purchase is older than 30 days and update the status to 'expired'
    const updateQuery = `
    UPDATE package_purchases 
    SET status = 'expired' 
    WHERE created_id < NOW() - INTERVAL '30 days';
`;

    await pool.query(updateQuery);

    const { rows } = await pool.query(query);

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching admin users and purchases:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch admin users and purchases" });
  }
});

app.delete("/api/ai_conversations/:conversation_id", async (req, res) => {
  const { conversation_id } = req.params;

  try {
    const deleteQuery = `
      DELETE FROM ai_conversations
      WHERE conversation_id = $1
      RETURNING *;
    `;
    const result = await pool.query(deleteQuery, [conversation_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "AI conversation not found" });
    }

    res.status(200).json({
      message: "AI conversation deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting AI conversation:", error);
    res.status(500).json({
      message: "Error deleting AI conversation.",
      error: error.message,
    });
  }
});
app.put("/api/ai_conversations/:conversation_id", async (req, res) => {
  const { conversation_id } = req.params;
  const {
    selected_consumer,
    admin_id,
    preferred_topics,
    conversation_times,
    conversation_time_notes,
    specific_time,
    interaction_frequency,
    frequency_note,
    frequency_range,
    tune_note,
    preferred_tone,
    special_cues,
    topics_to_avoid,
  } = req.body;

  try {
    const updateQuery = `
      UPDATE ai_conversations
      SET 
        consumer_id = COALESCE($1, consumer_id),
        admin_id = COALESCE($2, admin_id),
        preferred_topics = COALESCE($3, preferred_topics),
        conversation_times = COALESCE($4, conversation_times),
        conversation_time_notes = COALESCE($5, conversation_time_notes),
        specific_time = COALESCE($6, specific_time),
        interaction_frequency = COALESCE($7, interaction_frequency),
        frequency_note = COALESCE($8, frequency_note),
        frequency_range = COALESCE($9, frequency_range),
        tune_note = COALESCE($10, tune_note),
        preferred_tone = COALESCE($11, preferred_tone),
        special_cues = COALESCE($12, special_cues),
        topics_to_avoid = COALESCE($13, topics_to_avoid)
      WHERE conversation_id = $14
      RETURNING *;
    `;

    const values = [
      selected_consumer,
      admin_id,
      preferred_topics,
      conversation_times,
      conversation_time_notes,
      specific_time,
      interaction_frequency,
      frequency_note,
      frequency_range,
      tune_note,
      preferred_tone,
      special_cues,
      topics_to_avoid,
      conversation_id,
    ];

    const result = await pool.query(updateQuery, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "AI conversation not found" });
    }

    res.status(200).json({
      message: "AI conversation updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating AI conversation:", error);
    res.status(500).json({
      message: "Error updating AI conversation.",
      error: error.message,
    });
  }
});
app.get("/api/ai_conversations/:consumer_id", async (req, res) => {
  const { consumer_id } = req.params;

  try {
    const query = `
      SELECT * FROM ai_conversations
      WHERE consumer_id = $1
    `;
    const result = await pool.query(query, [consumer_id]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "No AI conversations found for this consumer." });
    }

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving AI conversations:", error);
    res.status(500).json({
      message: "Error retrieving AI conversations.",
      error: error.message,
    });
  }
});
app.get("/api/ai_conversationsadmin/:admin_id", async (req, res) => {
  const { admin_id } = req.params;

  try {
    const query = `
      SELECT * FROM ai_conversations
      WHERE admin_id = $1
    `;
    const result = await pool.query(query, [admin_id]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "No AI conversations found for this admin." });
    }

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving AI conversations:", error);
    res.status(500).json({
      message: "Error retrieving AI conversations.",
      error: error.message,
    });
  }
});

// Save FCM device token
app.post("/api/fcm/token", async (req, res) => {
  const { token, id } = req.body;
  console.log({ token, id });
  try {
    const query = `
      SELECT * from consumers where id=$1;
    `;
    const consumerResult = await pool.query(query, [id]);
    if (consumerResult.rows.length === 0) {
      console.log("Consumer not found");
      return res.status(404).json({ message: "Consumer not found" });
    }

    const tokenQuery = `
      UPDATE consumers SET device_token=$1 WHERE id=$2;
    `;
    await pool.query(tokenQuery, [token, id]);
    res.status(200).json({ message: "Token saved successfully" });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    res.status(500).json({ message: "Error saving FCM token" });
  }
});

// consumer login
app.post("/api/consumers/login", async (req, res) => {
  const { username, password } = req.body;
  console.log({ username, password });

  // Basic validation
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    // Query the consumer record by username, including the related admin details
    const query = `
      SELECT consumers.*, 
             admin.admin_id AS admin_id, 
             admin.admin_name AS admin_name, 
             admin.admin_email AS admin_email, 
             admin.admin_emergency_no AS admin_emergency_no
      FROM consumers
      LEFT JOIN admin ON consumers.admin_id = admin.admin_id
      WHERE consumers.username = $1
    `;
    const consumerResult = await pool.query(query, [username]);

    // Check if user exists
    if (consumerResult.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const consumer = consumerResult.rows[0];

    // Compare provided password with the hashed password
    const isMatch = await bcrypt.compare(password, consumer.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // At this point, login is successful
    return res.status(200).json({
      message: "Login successful",
      consumer: {
        id: consumer.id,
        username: consumer.username,
        // Include any other consumer fields you want to return
      },
      admin: {
        id: consumer.admin_id,
        name: consumer.admin_name,
        email: consumer.admin_email,
        emergency_no: consumer.admin_emergency_no,
        // Add any other admin fields you may need
      },
    });
  } catch (error) {
    console.error("Error logging in consumer:", error);
    return res.status(500).json({ message: "An error occurred during login" });
  }
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
