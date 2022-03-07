import 'dotenv/config'
import Chromium from 'chrome-aws-lambda'
import { S3 } from 'aws-sdk'
import dayjs from 'dayjs'
import handlebars from 'handlebars'
import { readFileSync } from 'fs'
import { join } from 'path'

import { document } from './../utils/dynamodbClient'

interface ICreateCertificateProps {
  id: string
  name: string
  grade: string
}

interface ITemplateCertificate {
  id: string
  name: string
  grade: string
  date: string
  medal: string
}

const compileHandlebars = async (data: ITemplateCertificate) => {
  const filePath = join(process.cwd(), 'src', 'templates', 'certificate.hbs')
  const html = readFileSync(filePath, 'utf-8')

  return handlebars.compile(html)(data)
}

export const handle = async (event) => {
  const { id, name, grade } = JSON.parse(event.body) as ICreateCertificateProps

  const response = await document.query({
    TableName: 'users_certificates',
    KeyConditionExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':id': id
    }
  }).promise()
  const userAlreadyExists = response.Items[0]

  if (!userAlreadyExists) {
    await document.put({
      TableName: 'users_certificates',
      Item: {
        id,
        name,
        grade
      }
    }).promise()
  }

  const medalPath = join(process.cwd(), 'src', 'templates', 'selo.png')
  const medal = readFileSync(medalPath, 'base64')
  const data: ITemplateCertificate = {
    id,
    name,
    grade,
    date: dayjs().format('DD/MM/YYYY'),
    medal
  }

  // Generate certificate
  const contentHandlebars = await compileHandlebars(data)
  // Convert to PDF
  const browser = Chromium.puppeteer.launch({
    args: Chromium.args,
    defaultViewport: Chromium.defaultViewport,
    executablePath: await Chromium.executablePath,
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions']
  })

  const page = await (await browser).newPage()
  await page.setContent(contentHandlebars)
  const pdf = await page.pdf({
    format: 'a4',
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    path: process.env.IS_OFFLINE ? 'certificate.pdf' : null
  })
  await (await browser).close()

  if (!process.env.IS_OFFLINE) {
    // Save to Amazon S3
    const s3 = new S3()
    await s3.putObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${id}.pdf`,
      ACL: 'public-read',
      Body: pdf,
      ContentType: 'application/pdf',
    }).promise()
  }


  return {
    statusCode: 201,
    body: JSON.stringify({
      message: 'Certificate created!',
      url: `${process.env.AWS_URL_FILE}/${id}.pdf`
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  }
}
