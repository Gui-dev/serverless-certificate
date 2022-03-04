import 'dotenv/config'
import { DynamoDB } from 'aws-sdk'

const options = {
  region: 'localhost',
  endpoint: 'http://localhost:8000',
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
}

const isOffline = () => process.env.IS_OFFLINE

export const document = isOffline()
  ? new DynamoDB.DocumentClient(options)
  : new DynamoDB.DocumentClient()

