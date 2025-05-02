import express from 'express';
import cors from 'cors';
import connectToMongo from './db.js'; // Add .js extension
import authRoutes from './routes/auth.js'; // Add .js extension
//import chatRoutes from './routes/chatapp.js'; // Add .js extension
// Assuming cookie-parser is needed based on previous context
import cookieParser from 'cookie-parser';

const app = express(); 


// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173', // Replace with the domain of your React application
  credentials: true, // This is required to include cookies in the requests
}));

// Routes
app.use('/api/users', authRoutes);
//app.use('/api/chats', chatRoutes);


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Example app listening on port http://localhost:${PORT}/`);
});

connectToMongo();