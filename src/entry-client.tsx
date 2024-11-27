/// <reference types="vinxi/types/client" />

import { StartClient } from '@tanstack/start'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

import { createRouter } from '~/libs/router'

const router = createRouter()

window.getRouter = () => router
window.getQueryClient = () => router.options.context.queryClient

hydrateRoot(document, (
  <StrictMode>
    <StartClient router={router} />
  </StrictMode>
))
