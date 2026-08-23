const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/database');
const { initSocket } = require('./socket');
const authRoutes = require('./router/authRoute');
const userRoutes = require('./router/userRoute');
const conversationRoutes = require('./router/conversationRoute');
const messageRoutes = require('./router/messageRoute');
const app = express();
app.use(express.json());
connectDB();
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

const server = http.createServer(app);
initSocket(server);

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
}
)
