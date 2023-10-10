import { Quasar } from 'quasar'
import { type UserModule } from '~/types'

// Import icon libraries
import '@quasar/extras/material-icons/material-icons.css'

export const install: UserModule = ({ app }) => {
  app.use(Quasar, {})
}
