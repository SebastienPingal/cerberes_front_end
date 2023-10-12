import PrimeVue from 'primevue/config'
import { type UserModule } from '~/types'

export const install: UserModule = ({ app }) => {
  app.use(PrimeVue)
}
