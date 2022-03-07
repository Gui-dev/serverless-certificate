import { APIGatewayProxyHandler } from "aws-lambda"
import { document } from './../utils/dynamodbClient'

export const handle: APIGatewayProxyHandler = async (event) => {
  const { id } = event.pathParameters
  const response = await document.query({
    TableName: 'users_certificates',
    KeyConditionExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':id': id
    }
  }).promise()

  const userCertificate = response.Items[0]

  if (userCertificate) {
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Valid certificate',
        name: userCertificate.name,
        url: `${process.env.AWS_URL_FILE}/${id}.pdf`
      })
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: 'Invalid certificate',
    })
  }
}
