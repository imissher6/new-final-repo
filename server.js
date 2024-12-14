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
app.use(express.urlencoded({ extended: true })); // Parses form data
app.use(express.json()); // Parses JSON data

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
    const { firstName, lastName, username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.render('register', {
                errorMessage: 'Username or Email already exists.',
                successMessage: null,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            firstName,
            lastName,
            username,
            email,
            password: hashedPassword,
        });

        await newUser.save();

        res.redirect('/login'); // Redirect to login page after successful registration
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Internal Server Error');
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
        return res.redirect('/login'); // Redirect if not logged in
    }

    const user = req.session.user; // Assuming user info is stored in the session
    res.render('services', { user });
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



app.get('/orders', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect if not logged in
    }

    try {
        // Fetch repair requests for the logged-in user
        const repairRequests = await RepairRequest.find({ userId: req.session.user._id }).sort({ date: -1 });

        // Pass the repairRequests and the user data to the template
        res.render('orders', {
            repairRequests,
            user: req.session.user // Include the user object
        });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send('Internal Server Error');
    }
});




const RepairRequestSchema = new mongoose.Schema({
    device: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    issue: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User model
});

module.exports = mongoose.model('RepairRequest', RepairRequestSchema);
const RepairRequest = mongoose.model('RepairRequest', RepairRequestSchema);

const EmployeeSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'employee' },
});

const Employee = mongoose.model('Employee', EmployeeSchema);

const ServiceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String }
});
const Service = mongoose.model('Service', ServiceSchema);
module.exports = Service;

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
    // Render the employee login page
    res.render('employee-login');
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
        console.log('Employee logged in:', req.session.employee); // Debugging log

        res.redirect('/employee/dashboard');
    } catch (err) {
        console.error('Error during employee login:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/employee/dashboard', async (req, res) => {
    if (!req.session.employee) {
        return res.redirect('/employee/login');
    }

    try {
        const recentOrders = await RepairRequest.find()
            .sort({ date: -1 })
            .limit(5)
            .populate('userId', 'firstName lastName'); // Populate user details
            console.log('Recent Orders:', recentOrders);

        res.render('employee-dashboard', {
            employee: req.session.employee,
            recentOrders,
        });
    } catch (err) {
        console.error('Error fetching recent orders:', err);
        res.status(500).send('Internal Server Error');
    }
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

    try {
        const orders = await RepairRequest.find()
            .sort({ date: -1 })
            .populate('userId', 'firstName lastName'); // Populate user info for each order

        res.render('employee-orders', { orders, employee: req.session.employee }); // Pass the employee object
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/employee/orders', async (req, res) => {
    if (!req.session.employee) {
        return res.redirect('/employee/login');
    }

    try {
        const orders = await RepairRequest.find()
            .sort({ date: -1 })
            .populate('userId', 'firstName lastName'); // Populate user info for each order
        res.render('employee-orders', { orders, employee: req.session.employee });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/orders/delete/:id', async (req, res) => {
    try {
        await RepairRequest.findByIdAndDelete(req.params.id); // Delete the specified record
        res.redirect('/orders'); // Redirect to the updated orders page
    } catch (err) {
        console.error('Error deleting order:', err);
        res.status(500).send('Internal Server Error');
    }
});


const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

module.exports = mongoose.model('Admin', AdminSchema);

app.get('/admin/employees', async (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login'); // Redirect to login if admin is not logged in
    }
    try {
        const employees = await Employee.find(); // Fetch all employees from the database
        res.render('admin-employees', { employees }); // Render the employee management page
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Create a New Employee
app.post('/admin/employees/create', async (req, res) => {
    const { name, email, username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password for security
        const newEmployee = new Employee({
            name,
            email,
            username,
            password: hashedPassword,
        });
        await newEmployee.save(); // Save the new employee to the database
        res.redirect('/admin/employees'); // Redirect back to the employee management page
    } catch (err) {
        console.error('Error creating employee:', err);
        res.status(500).send('Error creating employee');
    }
});

// Delete an Employee
app.post('/admin/employees/delete/:id', async (req, res) => {
    try {
        await Employee.findByIdAndDelete(req.params.id); // Delete employee by ID
        res.redirect('/admin/employees'); // Redirect back to the employee management page
    } catch (err) {
        console.error('Error deleting employee:', err);
        res.status(500).send('Error deleting employee');
    }
});

app.get('/admin/register', (req, res) => {
    res.render('admin-register', { errorMessage: null, successMessage: null });
});

// POST: Handle Admin Registration
app.post('/admin/register', async (req, res) => {
    const { name, email, username, password } = req.body;

    try {
        const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
        if (existingAdmin) {
            return res.render('admin-register', { 
                errorMessage: 'Email or username already exists', 
                successMessage: null 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new Admin({
            name,
            email,
            username,
            password: hashedPassword,
        });

        await newAdmin.save();
        console.log('Redirecting to /admin/login');
        res.redirect('/admin/login');
    } catch (err) {
        console.error('Error during admin registration:', err);
        res.render('admin-register', { 
            errorMessage: 'An error occurred. Please try again.', 
            successMessage: null 
        });
    }
});


app.get('/admin/login', (req, res) => {
    // Pass an empty errorMessage if none exists
    res.render('admin-login', { errorMessage: null });
});

app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find admin in database
        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(401).render('admin-login', { errorMessage: 'Invalid username or password' });
        }

        // Compare entered password with stored hashed password
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).render('admin-login', { errorMessage: 'Invalid username or password' });
        }

        // Set admin session
        req.session.admin = admin;

        // Redirect to dashboard
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Error during admin login:', err);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
        }
        res.redirect('/admin/login');
    });
});



// Dashboard Route
app.get('/admin/dashboard', async (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    }

    try {
        const newOrders = await RepairRequest.find({ status: 'Pending' }).sort({ date: -1 });
        const totalOrders = await RepairRequest.countDocuments();
        const totalUsers = await User.countDocuments();

        res.render('admin-dashboard', {
            admin: req.session.admin,
            newOrders,
            totalOrders,
            totalUsers
        });
    } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Manage Users Route
app.get('/admin/users', async (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    }

    try {
        const users = await User.find();
        const employees = await Employee.find();
        res.render('admin-users', { users, employees });
    } catch (err) {
        console.error('Error loading users:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Create User Route (GET)
app.get('/admin/users/create', (req, res) => {
    res.render('admin-create-user', { errorMessage: null });
});

// Create User Route (POST)
app.post('/admin/users/create', async (req, res) => {
    const { name, email, username, password, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser =
            role === 'Employee'
                ? new Employee({ name, email, username, password: hashedPassword })
                : new User({ name, email, username, password: hashedPassword });

        await newUser.save();
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error creating user:', err);
        res.render('admin-create-user', { errorMessage: 'Failed to create user' });
    }
});

// Edit User Route (GET)
app.get('/admin/users/edit/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id) || (await Employee.findById(req.params.id));
        res.render('admin-edit-user', { user, errorMessage: null });
    } catch (err) {
        console.error('Error fetching user for edit:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Edit User Route (POST)
app.post('/admin/users/edit/:id', async (req, res) => {
    const { name, email, username, role } = req.body;

    try {
        if (role === 'Employee') {
            await Employee.findByIdAndUpdate(req.params.id, { name, email, username });
        } else {
            await User.findByIdAndUpdate(req.params.id, { name, email, username });
        }

        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Delete User Route
app.post('/admin/users/delete/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id) || (await Employee.findByIdAndDelete(req.params.id));
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).send('Internal Server Error');
    }
});

const OrderSchema = new mongoose.Schema({
    device: String,
    date: { type: Date, default: Date.now },
    time: String,
    issue: String,
    status: { type: String, default: 'Pending' }
});

module.exports = mongoose.model('Order', OrderSchema);

app.post('/orders', async (req, res) => {
    console.log('Order data received:', req.body); // Debugging log

    const { device, date, time, issue } = req.body;

    try {
        // Ensure the user is logged in
        if (!req.session.user) {
            return res.redirect('/login');
        }

        // Create a new repair request
        const newOrder = new RepairRequest({
            device,
            date: new Date(date), // Convert date to proper Date format
            time,
            issue,
            status: 'Pending', // Default status
            userId: req.session.user._id, // Associate with logged-in user
        });

        await newOrder.save(); // Save to the database
        console.log('New Order Created:', newOrder); // Debugging log

        res.redirect('/orders'); // Redirect to orders page
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/admin/orders', async (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login'); // Redirect to login if the admin is not authenticated
    }

    try {
        // Fetch all orders from the database
        const orders = await RepairRequest.find().sort({ date: -1 });

        // Render the orders page and pass the orders data
        res.render('admin-orders', { admin: req.session.admin, orders });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/orders/delete/:id', async (req, res) => {
    try {
        await RepairRequest.findByIdAndDelete(req.params.id); // Delete the order
        res.redirect('/admin/orders'); // Redirect back to the orders page
    } catch (err) {
        console.error('Error deleting order:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/orders/update/:id', async (req, res) => {
    try {
        await RepairRequest.findByIdAndUpdate(req.params.id, { status: 'Completed' }); // Example status update
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/submit-repair-request', async (req, res) => {
    const { date, time, issue, message, device } = req.body;

    if (!req.session.user) {
        return res.redirect('/login'); // Ensure the user is logged in
    }

    try {
        // Create a new repair request
        const newOrder = new RepairRequest({
            device,
            date: new Date(date), // Ensure date is properly formatted
            time,
            issue,
            status: 'Pending', // Default status
            userId: req.session.user._id, // Associate with logged-in user
        });

        await newOrder.save(); // Save the order to the database
        console.log('New Order Created:', newOrder); // Debugging log
        res.redirect('/orders'); // Redirect to the orders page
    } catch (err) {
        console.error('Error saving repair request:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to update order status
app.post('/employee/orders/update/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        await RepairRequest.findByIdAndUpdate(id, { status });
        res.redirect('/employee/orders'); // Redirect back to the orders page
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).send('Internal Server Error');
    }
});


// Route to delete an order
app.post('/employee/orders/delete/:id', async (req, res) => {
    try {
        await RepairRequest.findByIdAndDelete(req.params.id);
        res.redirect('/employee/orders');
    } catch (err) {
        console.error('Error deleting order:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Admin: Manage Services Page
app.get('/admin/services', async (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login'); // Redirect if not logged in
    }
    try {
        const services = await Service.find();
        res.render('admin-services', { admin: req.session.admin, services });
    } catch (err) {
        console.error('Error loading services:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/services/update/:id', async (req, res) => {
    const { name, description, icon } = req.body;
    try {
        await Service.findByIdAndUpdate(req.params.id, { name, description, icon });
        res.redirect('/admin/services');
    } catch (err) {
        console.error('Error updating service:', err);
        res.status(500).send('Failed to update service');
    }
});


// Admin: Add a New Service
app.post('/admin/services/add', async (req, res) => {
    const { name, description, icon } = req.body;
    try {
        const newService = new Service({ name, description, icon });
        await newService.save();
        res.redirect('/admin/services');
    } catch (err) {
        console.error('Error adding service:', err);
        res.status(500).send('Failed to add service');
    }
});

// Admin: Delete a Service
app.post('/admin/services/delete/:id', async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        res.redirect('/admin/services');
    } catch (err) {
        console.error('Error deleting service:', err);
        res.status(500).send('Failed to delete service');
    }
});


app.get('/services', async (req, res) => {
    try {
        // Fetch all services from the database
        const services = await Service.find();

        // Render the services.ejs template and pass the services array
        res.render('services', { user: req.session.user, services });
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Render the Edit Form for Users or Employees
app.get('/admin/edit/:type/:id', async (req, res) => {
    const { type, id } = req.params;

    try {
        let record;

        // Fetch the record from the appropriate collection
        if (type === 'user') {
            record = await User.findById(id);
        } else if (type === 'employee') {
            record = await Employee.findById(id);
        } else {
            return res.status(400).send('Invalid type specified');
        }

        if (!record) {
            return res.status(404).send('Record not found');
        }

        res.render('admin-edit', { type, record });
    } catch (err) {
        console.error('Error fetching record:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Handle Updating the Credentials
app.post('/admin/edit/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { name, email, username, password } = req.body;

    try {
        let updateData = { name, email, username };

        // If password is provided, hash it and include it in the update
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update the record in the appropriate collection
        if (type === 'user') {
            await User.findByIdAndUpdate(id, updateData);
        } else if (type === 'employee') {
            await Employee.findByIdAndUpdate(id, updateData);
        } else {
            return res.status(400).send('Invalid type specified');
        }

        res.redirect('/admin/users'); // Redirect to the user management page
    } catch (err) {
        console.error('Error updating record:', err);
        res.status(500).send('Internal Server Error');
    }
});

const router = express.Router();

router.post('/register', async (req, res) => {
    const { fullName, username, email, password } = req.body;

    try {
        // Check if username or email already exists
        const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
        if (existingAdmin) {
            return res.status(400).send('Email or username already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save new admin
        const newAdmin = new Admin({
            fullName,
            username,
            email,
            password: hashedPassword,
        });

        await newAdmin.save();

        // Redirect to login page after successful registration
        res.redirect('/admin/login');
    } catch (error) {
        console.error('Error during admin registration:', error);
        res.status(500).send('An error occurred. Please try again.');
    }
});

app.get('/admin/supplier', (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login'); // Ensure admin is logged in
    }

    res.render('admin-supplier', { admin: req.session.admin });
});

module.exports = router;

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});