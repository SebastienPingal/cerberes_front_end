import PrimeVue from 'primevue/config'
import { type UserModule } from '~/types'

export const install: UserModule = ({ app, router, isClient }) => {
  app.use(PrimeVue)
}
