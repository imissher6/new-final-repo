const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware for parsing form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set up session middleware
app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true,
}));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/apexsolutions', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define Mongoose Models
const UserSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    phoneNumber: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
    age: Number,
});

const User = mongoose.model('User', UserSchema);

// Set EJS as the template engine
app.set('view engine', 'ejs');

// Routes
// Home Page (Redirect to login if not authenticated)
app.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.redirect('/services'); // Redirect to services page for logged-in users
});

// Register Page
app.get('/register', (req, res) => {
    res.render('register');
});

// Handle Registration
app.post('/register', async (req, res) => {
    const { firstName, lastName, phoneNumber, username, email, password, age } = req.body;

    if (age < 13) {
        return res.status(400).send('You must be at least 13 years old to register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        firstName,
        lastName,
        phoneNumber,
        username,
        email,
        password: hashedPassword,
        age,
    });

    try {
        await newUser.save();
        res.redirect('/login');
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).send('Error registering user');
    }
});

// Login Page
app.get('/login', (req, res) => {
    res.render('login');
});

// Handle Login
app.post('/login', async (req, res) => {
    const { usernameOrEmail, password } = req.body;

    const user = await User.findOne({
        $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }]
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).send('Invalid credentials');
    }

    req.session.user = user;
    res.redirect('/services'); // Redirect to services page after login
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/login');
    });
});

// IT Services Page
app.get('/services', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('services', { user: req.session.user }); // Pass user data to the template
});

// Example IT Service Routes
app.get('/service/equipment-replacement', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.send('Equipment Replacement Service Page');
});

app.get('/service/device-repair', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('device-repair'); // Render the device repair page
});

app.get('/service/device-repair/phone', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('repair-form', { device: 'Phone' }); // Pass the device type to the form
});

app.get('/service/device-repair/computer', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('repair-form', { device: 'Computer' });
});

app.get('/service/device-repair/printer', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('repair-form', { device: 'Printer' });
});

app.get('/service/device-repair/iot', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('repair-form', { device: 'IoT Device' });
});

app.post('/submit-repair-request', (req, res) => {
    const { date, time, issue, message, device } = req.body;

    // Here, you can save the form data to the database (e.g., MongoDB)
    console.log(`Repair Request Received:
        Device: ${device}
        Date: ${date}
        Time: ${time}
        Issue: ${issue}
        Message: ${message}`);

    res.send(`<h1>Thank you! Your repair request for ${device} has been submitted.</h1>`);
});

app.get('/orders', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        // Fetch the user's repair requests from the database
        const repairRequests = await RepairRequest.find(); // Add filtering by user if needed
        res.render('orders', { repairRequests });
    } catch (err) {
        console.error('Error fetching repair requests:', err);
        res.status(500).send('Internal Server Error');
    }
});

const RepairRequestSchema = new mongoose.Schema({
    device: String,
    date: String,
    time: String,
    issue: String,
    message: String,
});

const RepairRequest = mongoose.model('RepairRequest', RepairRequestSchema);

const EmployeeSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'employee' },
});

const Employee = mongoose.model('Employee', EmployeeSchema);

app.post('/employee/register', async (req, res) => {
    const { username, password, name } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newEmployee = new Employee({ username, password: hashedPassword, name });
        await newEmployee.save();
        res.status(201).send('Employee registered successfully');
    } catch (err) {
        console.error('Error registering employee:', err);
        res.status(500).send('Error registering employee');
    }
});

app.get('/employee/login', (req, res) => {
    res.render('employee-login'); // Render the employee login page
});

app.post('/employee/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const employee = await Employee.findOne({ username });
        if (!employee || !(await bcrypt.compare(password, employee.password))) {
            return res.status(400).send('Invalid credentials');
        }

        req.session.employee = {
            id: employee._id,
            name: employee.name,
            role: employee.role,
        };

        res.redirect('/employee/dashboard');
    } catch (err) {
        console.error('Error during employee login:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/employee/dashboard', (req, res) => {
    if (!req.session.employee) {
        return res.redirect('/employee/login');
    }

    res.render('employee-dashboard', {
        employee: req.session.employee,
    });
});

app.get('/employee/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
        }
        res.redirect('/employee/login');
    });
});

app.get('/employee/orders', async (req, res) => {
    if (!req.session.employee) {
        return res.redirect('/employee/login');
    }

    // Fetch all client orders (customize as needed)
    const orders = await RepairRequest.find(); // Add filters for specific needs
    res.render('employee-orders', { orders });
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

