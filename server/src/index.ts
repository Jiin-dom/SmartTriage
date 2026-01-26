import express from 'express'
import cors from 'cors'
import { config } from './config'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import ticketRoutes from './routes/tickets'
import userRoutes from './routes/users'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/users', userRoutes)

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`)
})

