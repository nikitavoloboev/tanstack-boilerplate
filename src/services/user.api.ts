import { createMiddleware, createServerFn } from '@tanstack/start'
import { getWebRequest } from 'vinxi/http'

import { auth } from '~/libs/auth'
import { prisma } from '~/libs/db'
import { tryCatchAsync } from '~/libs/utils'
import { getAuth } from '~/services/auth.api'
import { changeEmailSchema, changePasswordSchema, updateUserSchema } from '~/services/user.schema'

export const userMiddleware = createMiddleware()
  .server(async ({ next }) => {
    const auth = await getAuth()

    if (!auth.isAuthenticated) {
      throw new Error('Unauthorized')
    }

    const request = getWebRequest()

    return next({
      context: {
        auth,
        request,
      },
    })
  })

export const updateUser = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .validator(updateUserSchema())
  .handler(async ({ data, context }) => {
    await auth.api.updateUser({
      headers: context.request.headers,
      body: data,
    })
  })

export const changeEmail = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .validator(changeEmailSchema())
  .handler(async ({ data, context }) => {
    if (data.newEmail === context.auth.user.email) {
    // TODO: i18n
      throw new Error('New email is the same as the current email')
    }

    const isEmailExists = await prisma.user.findUnique({
      where: {
        email: data.newEmail,
      },
    })

    if (isEmailExists) {
    // TODO: i18n
      throw new Error('Email already exists')
    }

    // make sure to unverify the email, so we can send a new verification email
    if (context.auth.user.emailVerified) {
      await prisma.user.update({
        where: {
          id: context.auth.user.id,
        },
        data: {
          emailVerified: false,
        },
      })
    }

    await auth.api.changeEmail({
      headers: context.request.headers,
      body: data,
    })

    await auth.api.sendVerificationEmail({
      headers: context.request.headers,
      body: {
        email: data.newEmail,
        callbackURL: '/',
      },
    })
  })

export const changePassword = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .validator(changePasswordSchema())
  .handler(async ({ data, context }) => {
    const [changePasswordError, changePasswordResult] = await tryCatchAsync(
      auth.api.changePassword({
        headers: context.request.headers,
        body: data,
      }),
    )

    if (changePasswordError) {
      throw new Error('TODO: error handling')
    }

    return {
      result: changePasswordResult,
      revokeOtherSessions: Boolean(data.revokeOtherSessions),
    }
  })

export const sendVerificationEmail = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .handler(async ({ context }) => {
    await auth.api.sendVerificationEmail({
      headers: context.request.headers,
      body: {
        email: context.auth.user.email,
        callbackURL: '/',
      },
    })
  })
